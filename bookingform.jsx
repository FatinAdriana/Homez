// pages/BookingForm.jsx - WITH DARK MODE
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Package, ArrowRight, AlertCircle, CheckCircle, X, Loader2, 
  MapPin, Shield, CreditCard, Wallet, Tag, ChevronDown 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext'; // ✅ ADD THIS
import VoiceAssistant from '../components/voiceassistant';
import gsap from 'gsap';

export default function BookingForm() {
  const navigate = useNavigate();
  const lenisRef = useRef(null);
  const { isDark } = useTheme(); // ✅ GET THEME STATE
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const addressInputRef = useRef(null);
  const { companyId } = useParams();
  const location = useLocation();
  const prefillData = location.state || {};

  // Refs for floating dots
  const floatingDotsRef = useRef([]);

  const [formData, setFormData] = useState({
    customerName: prefillData.customerName || '',
    customerEmail: prefillData.customerEmail || '',
    customerPhone: prefillData.customerPhone || '',
    customerAddress: prefillData.customerAddress || '',
    serviceType: prefillData.serviceType || '',
    issueDescription: prefillData.issueDescription || '',
    preferredDate: prefillData.preferredDate || '',
    preferredTime: prefillData.preferredTime || '',
    urgencyLevel: prefillData.urgencyLevel || 'MEDIUM',
    propertyType: prefillData.propertyType || '',
    accessInstructions: '',
    previousService: 'no',
    warrantyStatus: 'none',
    specialRequests: '',
    productId: '',
    paymentMethod: 'card'
  });

  // Fields highlighted green after voice fill
  const [highlighted, setHighlighted] = useState({});

  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [files, setFiles] = useState({ issuePhoto: null, warrantyPhoto: null });
  const [filePreviews, setFilePreviews] = useState({ issuePhoto: null, warrantyPhoto: null });
  const [userProducts, setUserProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productsFetched, setProductsFetched] = useState(false);
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [checkingWarranty, setCheckingWarranty] = useState(false);
  const [warrantyError, setWarrantyError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [showMap, setShowMap] = useState(false);
  
  // New state for user coupons
  const [userCoupons, setUserCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);

  // Add to floating dots ref
  const addToFloatingDots = (el) => {
    if (el && !floatingDotsRef.current.includes(el)) {
      floatingDotsRef.current.push(el);
    }
  };

  // GSAP Floating Dots Animation
  useEffect(() => {
    floatingDotsRef.current.forEach((dot, i) => {
      if (dot) {
        gsap.to(dot, {
          y: "random(-30, 30)",
          x: "random(-30, 30)",
          duration: "random(4, 8)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2
        });
      }
    });

    return () => {
      floatingDotsRef.current.forEach(dot => {
        if (dot) gsap.killTweensOf(dot);
      });
    };
  }, [isDark]);

  /* ── Lenis smooth scroll ── */
  useEffect(() => {
    let lenis;
    const initLenis = async () => {
      try {
        const LenisModule = await import('@studio-freight/lenis');
        const Lenis = LenisModule.default || LenisModule.Lenis;
        lenis = new Lenis({
          duration: 1.4,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          smoothWheel: true,
        });
        lenisRef.current = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } catch {
        // Lenis not installed — falls back to native scroll gracefully
      }
    };
    initLenis();
    return () => {
      if (lenis) lenis.destroy();
      gsap.ticker.remove(() => {});
    };
  }, []);

  const getAuthToken = () => localStorage.getItem('token');
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('userData')); } catch { return null; }
  };
  const user = getUser();

  // ================================================================
  // Listen to window event from VoiceAssistant
  // ================================================================
  useEffect(() => {
    const handleVoiceFill = (event) => {
      const data = event.detail;
      console.log('🎤 window event received! Filling form with:', data);

      setFormData(prev => {
        const updated = { ...prev, ...data };
        console.log('✅ Form updated:', updated);
        return updated;
      });

      setHighlighted(data);
      setTimeout(() => setHighlighted({}), 2000);

      const labels = {
        customerName: 'Name', customerEmail: 'Email', customerPhone: 'Phone',
        customerAddress: 'Address', propertyType: 'Property Type',
        serviceType: 'Service', preferredDate: 'Date', preferredTime: 'Time',
        urgencyLevel: 'Urgency',
      };
      const filled = Object.keys(data).map(k => labels[k] || k).join(', ');
      setMessage({ type: 'success', text: `🎤 Voice filled: ${filled}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    window.addEventListener('voice-fill-form', handleVoiceFill);
    return () => window.removeEventListener('voice-fill-form', handleVoiceFill);
  }, []);

  // ================================================================
  // INITIALIZE PLACES AUTOCOMPLETE
  // ================================================================
  useEffect(() => {
    const initAutocomplete = () => {
      if (window.google && window.google.maps && window.google.maps.places && addressInputRef.current) {
        try {
          const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
            types: ['address'],
            componentRestrictions: { country: 'my' },
            fields: ['formatted_address', 'geometry', 'name']
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              setFormData(prev => ({ 
                ...prev, 
                customerAddress: place.formatted_address 
              }));
              
              setHighlighted({ customerAddress: true });
              setTimeout(() => setHighlighted({}), 2000);
            }
          });
          
          console.log('✅ Google Places Autocomplete initialized');
        } catch (error) {
          console.error('Error initializing autocomplete:', error);
        }
      } else {
        console.log('⏳ Waiting for Google Maps to load...');
      }
    };

    initAutocomplete();

    const checkGoogleMapsLoaded = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        initAutocomplete();
        clearInterval(checkGoogleMapsLoaded);
      }
    }, 500);

    return () => clearInterval(checkGoogleMapsLoaded);
  }, []);

  // ================================================================
  // GET CURRENT LOCATION
  // ================================================================
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser' });
      return;
    }

    setIsGettingLocation(true);
    setMessage({ type: 'info', text: '📍 Getting your location...' });
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log('📍 Got coordinates:', latitude, longitude);
          
          let address = null;
          
          try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
              throw new Error('Google Maps API key not found');
            }
            
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📍 Geocoding response:', data);
            
            if (data.status === 'OK' && data.results && data.results[0]) {
              address = data.results[0].formatted_address;
            } else {
              console.error('Geocoding error:', data);
            }
          } catch (geoError) {
            console.error('Geocoding API error:', geoError);
          }
          
          if (!address) {
            address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            console.log('📍 Using coordinates as fallback:', address);
            setMessage({ 
              type: 'warning', 
              text: '📍 Location detected! Please verify your address.' 
            });
          } else {
            setMessage({ type: 'success', text: '📍 Location detected!' });
          }
          
          setFormData(prev => ({ ...prev, customerAddress: address }));
          
          setHighlighted({ customerAddress: true });
          setTimeout(() => setHighlighted({}), 2000);
          
        } catch (error) {
          console.error('Geolocation processing error:', error);
          setMessage({ type: 'error', text: 'Failed to process your location' });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
        
        let errorMessage = 'Could not get your location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please allow location access in your browser';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        setMessage({ type: 'error', text: errorMessage });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // ================================================================
  // FETCH USER COUPONS
  // ================================================================
  const fetchUserCoupons = async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoadingCoupons(true);
    try {
      const response = await axios.get(
        `http://localhost:5001/coupons/my-coupons?companyId=${companyId}&serviceType=${formData.serviceType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setUserCoupons(response.data.coupons);
      }
    } catch (error) {
      console.error('Error fetching user coupons:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  // Fetch coupons when company and service type are selected
  useEffect(() => {
    if (companyId && formData.serviceType) {
      fetchUserCoupons();
    }
  }, [companyId, formData.serviceType]);

  // Function to apply a coupon from the dropdown
  const handleSelectCoupon = (coupon) => {
    setCouponCode(coupon.code);
    setShowCouponDropdown(false);
    setTimeout(() => handleApplyCoupon(), 100);
  };

  // ================================================================
  // FETCH DATA
  // ================================================================
  const fetchUserProducts = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      setProductsLoading(true);
      const res = await axios.get('http://localhost:5001/products/my-products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setUserProducts(res.data.products || []);
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setProductsLoading(false);
      setProductsFetched(true);
    }
  };

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5001/public/companies/${companyId}`);
      if (res.data.success) {
        setCompany(res.data.company);
        
        console.log('🏢 Company in frontend:', {
          name: res.data.company.name,
          id: res.data.company.id,
          profileName: res.data.company.profile?.companyName,
          fullCompanyData: res.data.company
        });
        
        setServices(res.data.company.services || []);
        const u = getUser();
        if (u) {
          setFormData(prev => ({
            ...prev,
            customerName: prev.customerName || u.name || '',
            customerEmail: prev.customerEmail || u.email || '',
            customerPhone: prev.customerPhone || u.phone || '',
          }));
        }
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load company details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setMessage({ type: 'error', text: 'Please login first' });
      setTimeout(() => navigate('/login'), 2000);
    } else {
      fetchUserProducts();
    }
  }, []);

  useEffect(() => {
    if (companyId && companyId !== 'undefined') fetchCompanyDetails();
  }, [companyId]);

  useEffect(() => {
    if (couponResult) { setCouponResult(null); setCouponCode(''); setCouponError('Price changed — re-apply coupon.'); }
  }, [formData.serviceType, formData.urgencyLevel]);

  // ================================================================
  // WARRANTY
  // ================================================================
  const checkProductWarranty = async (productId) => {
    if (!productId || !company?.id) return;
    try {
      setCheckingWarranty(true);
      const token = getAuthToken();
      const res = await axios.get(`http://localhost:5001/warranty/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        const warranty = res.data.warranty;
        console.log('📦 Warranty data:', warranty);
        setWarrantyInfo(warranty);
      } else {
        setWarrantyInfo(null);
      }
    } catch (e) {
      if (e.response?.status !== 404) setWarrantyError('Could not check warranty');
      else setWarrantyInfo(null);
    } finally {
      setCheckingWarranty(false);
    }
  };

  const handleProductSelect = (productId) => {
    const product = userProducts.find(p => p.id === productId);
    setSelectedProduct(product);
    setFormData(prev => ({ ...prev, productId }));
    if (product && company) checkProductWarranty(productId);
    if (product && !formData.issueDescription.includes(product.brand)) {
      setFormData(prev => ({
        ...prev,
        issueDescription: prev.issueDescription + `\n\n--- Product ---\n${product.brand} ${product.model} (${product.serialNumber})`
      }));
    }
  };

  // ================================================================
  // FORM HANDLERS
  // ================================================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: 'error', text: 'File too large (max 5MB)' }); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { setMessage({ type: 'error', text: 'Only JPEG/PNG allowed' }); return; }
    setFiles(prev => ({ ...prev, [fileType]: file }));
    setFilePreviews(prev => ({ ...prev, [fileType]: URL.createObjectURL(file) }));
  };

  const removeFile = (fileType) => {
    setFiles(prev => ({ ...prev, [fileType]: null }));
    if (filePreviews[fileType]) URL.revokeObjectURL(filePreviews[fileType]);
    setFilePreviews(prev => ({ ...prev, [fileType]: null }));
  };

  // ================================================================
  // PRICING
  // ================================================================
  const getPricing = () => {
    const sel = services.find(s => s.name === formData.serviceType);
    const basePrice = sel ? Number(sel.basePrice) : 0;
    const urgencyFee = formData.urgencyLevel === 'URGENT' ? 100 : formData.urgencyLevel === 'HIGH' ? 50 : 0;
    const subtotal = basePrice + urgencyFee;
    const discountAmount = couponResult?.success ? Number(couponResult.discountAmount) : 0;
    
    const isSameCompany = warrantyInfo?.companyId === company?.id;
    
    if (warrantyInfo?.hasActiveWarranty && isSameCompany) {
      console.log('🎯 WARRANTY ACTIVE - Same company (ID match) - Setting price to FREE');
      return { 
        basePrice, 
        urgencyFee, 
        subtotal, 
        discountAmount, 
        finalPrice: 0,
        isWarrantyFree: true
      };
    }
    
    const finalPrice = Math.max(subtotal - discountAmount, 0);
    return { 
      basePrice, 
      urgencyFee, 
      subtotal, 
      discountAmount, 
      finalPrice,
      isWarrantyFree: false 
    };
  };

  // ================================================================
  // COUPON
  // ================================================================
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { subtotal } = getPricing();
    if (!subtotal) { setCouponError('Select a service first.'); return; }
    setCouponLoading(true); setCouponError(''); setCouponResult(null);
    try {
      const u = getUser();
      const res = await axios.post('http://localhost:5001/coupons/validate', {
        code: couponCode.trim().toUpperCase(), totalAmount: subtotal,
        companyId, serviceType: formData.serviceType, userId: u?.id
      });
      if (res.data.success) setCouponResult(res.data);
    } catch (e) {
      setCouponError(e.response?.data?.message || 'Invalid coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  // ================================================================
  // SUBMIT
  // ================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) { navigate('/login'); return; }

    const required = ['customerName', 'customerEmail', 'customerPhone', 'customerAddress',
      'serviceType', 'issueDescription', 'preferredDate', 'preferredTime', 'propertyType'];
    if (required.some(f => !formData[f])) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    setLoading(true);
    try {
      const { basePrice, urgencyFee, subtotal, discountAmount, finalPrice, isWarrantyFree } = getPricing();
      
      const isSameCompany = warrantyInfo?.companyId === company?.id;
      const isWarrantyClaim = warrantyInfo?.hasActiveWarranty && isSameCompany;
      
      console.log('🔍 DEBUG - Booking submission:', {
        warrantyInfo: warrantyInfo,
        companyId: company?.id,
        isSameCompany: isSameCompany,
        isWarrantyClaim: isWarrantyClaim,
        finalPrice: finalPrice,
        basePrice: basePrice,
        paymentMethod: formData.paymentMethod
      });
      
      const fd = new FormData();
      Object.keys(formData).forEach(k => { if (formData[k] != null) fd.append(k, formData[k]); });
      if (files.issuePhoto) fd.append('issuePhoto', files.issuePhoto);
      if (files.warrantyPhoto) fd.append('warrantyPhoto', files.warrantyPhoto);
      fd.append('companyId', companyId);
      
      if (warrantyInfo?.hasActiveWarranty) {
        fd.append('warrantyApplied', 'true');
        fd.append('warrantyId', warrantyInfo.id);
        fd.append('warrantyIssuedBy', warrantyInfo.issuedBy);
        fd.append('warrantyCompanyId', warrantyInfo.companyId);
        fd.append('warrantyExpiresAt', warrantyInfo.expiresAt);
      }
      
      if (couponResult?.success) {
        fd.append('couponId', couponResult.coupon.id);
        fd.append('couponCode', couponResult.coupon.code);
        fd.append('discountAmount', discountAmount.toFixed(2));
      }
      
      const finalAmount = isWarrantyClaim ? 0 : finalPrice;
      
      fd.append('basePrice', basePrice.toFixed(2));
      fd.append('urgencyFee', urgencyFee.toFixed(2));
      fd.append('totalPrice', subtotal.toFixed(2));
      fd.append('finalPrice', finalAmount.toFixed(2));
      fd.append('paymentMethod', formData.paymentMethod);

      const res = await axios.post('http://localhost:5001/booking/create', fd, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Booking created successfully!' });
        
        localStorage.setItem('currentBooking', JSON.stringify({
          id: res.data.booking.id,
          totalPrice: res.data.booking.finalPrice,
          bookingRef: res.data.booking.bookingRef,
          isWarrantyClaim,
          paymentMethod: formData.paymentMethod
        }));
        
        setTimeout(() => {
          if (isWarrantyClaim) {
            console.log('🚨 WARRANTY DETECTED - Redirecting to success page');
            navigate(`/booking/success/${res.data.booking.id}`, {
              state: { 
                booking: res.data.booking,
                isFree: true,
                warrantyInfo: warrantyInfo
              }
            });
          } else if (formData.paymentMethod === 'cash') {
            console.log('💰 CASH PAYMENT - Redirecting to success page');
            navigate(`/booking/success/${res.data.booking.id}`, {
              state: { 
                booking: res.data.booking,
                isFree: false,
                paymentMethod: 'cash',
                totalPrice: finalAmount
              }
            });
          } else {
            console.log('💳 CARD PAYMENT - Redirecting to payment page');
            navigate(`/payment/${res.data.booking.id}`, {
              state: { 
                booking: res.data.booking, 
                totalPrice: finalAmount
              }
            });
          }
        }, 1500);
      }
    } catch (e) {
      console.error('❌ Submit error:', e);
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to submit.' });
      if (e.response?.status === 401) { localStorage.clear(); navigate('/login'); }
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 9; h <= 18; h++) { 
      slots.push(`${h}:00`); 
      if (h < 18) slots.push(`${h}:30`); 
    }
    return slots;
  };

  const vc = (field) => `w-full border rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500 ${
    highlighted[field] 
      ? 'border-green-500 ring-2 ring-green-400 bg-green-50' 
      : isDark 
        ? 'border-dark-border bg-dark-bg text-white' 
        : 'border-gray-300 bg-white text-gray-900'
  }`;

  const pricing = getPricing();

  const WarrantyWarning = () => {
    if (!selectedProduct) return null;
    if (checkingWarranty) return <div className={`mb-4 p-3 border rounded-lg text-sm flex items-center gap-2 ${
      isDark ? 'bg-gray-800 border-dark-border text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
    }`}><Loader2 className="w-4 h-4 animate-spin" /> Checking warranty...</div>;
    if (!warrantyInfo?.hasActiveWarranty) return <div className={`mb-4 p-3 border rounded-lg text-sm ${
      isDark ? 'bg-gray-800 border-dark-border text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
    }`}>No active warranty.</div>;
    
    const isSameCompany = warrantyInfo.companyId === company?.id;
    
    if (isSameCompany) {
      return (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-green-800 text-sm font-bold">✅ WARRANTY ACTIVE - THIS SERVICE IS FREE!</p>
              <p className="text-green-700 text-xs mt-1">
                Issued by: <span className="font-semibold">{company?.name}</span>
              </p>
              <p className="text-green-700 text-xs">Expires: {new Date(warrantyInfo.expiresAt).toLocaleDateString()}</p>
              <p className="text-green-700 text-xs font-bold mt-2">
                You save: RM {services.find(s => s.name === formData.serviceType)?.basePrice || 0}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ This product has a warranty with another company
            </p>
            <p className="text-amber-700 text-xs mt-1">
              Booking with {company?.name} — regular charges apply.
            </p>
            <p className="text-amber-700 text-xs mt-2">
              <span className="font-medium">Note:</span> To use your warranty, please book with the company that issued it.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!companyId || companyId === 'undefined') return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDark ? 'bg-dark-bg' : 'bg-gray-50'
    }`}>
      <div className={`p-8 rounded-lg shadow max-w-md text-center ${
        isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
      }`}>
        <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-red-400' : 'text-red-600'}`}>No Company Selected</h2>
        <button onClick={() => navigate('/service-providers')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">← Back</button>
      </div>
    </div>
  );

  if (loading && !company) return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDark ? 'bg-dark-bg' : 'bg-gray-50'
    }`}>
      <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
        isDark ? 'border-blue-400' : 'border-blue-600'
      }`} />
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark ? 'bg-dark-bg text-gray-200' : 'bg-gray-50 text-gray-800'
    } font-sans`}>
      
      {/* FLOATING DOTS BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            ref={addToFloatingDots}
            className={`absolute w-1 h-1 rounded-full ${
              isDark ? 'bg-white/20' : 'bg-gray-400/20'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <VoiceAssistant userData={user} onAction={() => {}} />

      {message.text && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md flex items-start gap-2 ${
          message.type === 'error' 
            ? isDark ? 'bg-red-900/30 border border-red-800 text-red-400' : 'bg-red-50 text-red-800 border border-red-200'
            : isDark ? 'bg-green-900/30 border border-green-800 text-green-400' : 'bg-green-50 text-green-800 border border-green-200'
        }`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* HERO SECTION */}
      <div className={`relative overflow-hidden z-10 ${
        isDark 
          ? 'bg-gradient-to-r from-[#1E293B] to-[#0F172A]' 
          : 'bg-gradient-to-r from-[#0F172A] to-[#1E293B]'
      } py-20`}>
        {/* Animated particles for dark mode */}
        {isDark && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${5 + Math.random() * 5}s infinite`
                }}
              />
            ))}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-5xl font-bold text-white mb-4">Book Service Appointment</h1>
            <p className="text-white/70 text-lg">Schedule with {company?.name || 'our technician'}</p>
          </div>
          {company && (
            <div className={`hidden md:block rounded-xl p-5 ${
              isDark ? 'bg-white/5 backdrop-blur-sm border border-white/10' : 'bg-white/10 backdrop-blur-sm'
            }`}>
              <div className="flex items-center gap-3">
                <img src={company.logo || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop'}
                  alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <p className="text-white font-bold">{company.name}</p>
                  <p className="text-white/60 text-sm">⭐ {company.rating?.toFixed(1)} ({company.totalReviews} reviews)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">

            {/* Products */}
            {productsFetched && userProducts.length > 0 && (
              <div className={`rounded-xl p-6 border ${
                isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
              }`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Package className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} /> Registered Products
                </h3>
                <select value={formData.productId} onChange={e => handleProductSelect(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 mb-3 ${
                    isDark 
                      ? 'bg-dark-bg border-dark-border text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}>
                  <option value="">-- Select a product (optional) --</option>
                  {userProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.category}</option>
                  ))}
                </select>
                {selectedProduct && (
                  <div className={`p-4 rounded-lg border text-sm grid grid-cols-2 gap-3 ${
                    isDark ? 'bg-gray-800 border-dark-border' : 'bg-white border-blue-200'
                  }`}>
                    <div><p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Brand/Model</p><p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedProduct.brand} {selectedProduct.model}</p></div>
                    <div><p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Serial</p><p className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>{selectedProduct.serialNumber}</p></div>
                  </div>
                )}
                <WarrantyWarning />
              </div>
            )}

            {/* Personal Details */}
            <div className={`rounded-xl shadow-sm p-6 ${
              isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-semibold mb-6 pb-3 border-b flex items-center gap-2 ${
                isDark ? 'text-white border-dark-border' : 'text-[#0F172A] border-gray-200'
              }`}>
                Personal Details
                {Object.keys(highlighted).some(k => ['customerName','customerEmail','customerPhone','customerAddress','propertyType'].includes(k)) && (
                  <span className="text-xs text-green-600 font-normal bg-green-50 px-2 py-1 rounded-full">🎤 Voice filling...</span>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name * {highlighted.customerName && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                  </label>
                  <input type="text" name="customerName" value={formData.customerName}
                    onChange={handleInputChange} placeholder="Your full name"
                    className={vc('customerName')} required />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email * {highlighted.customerEmail && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                  </label>
                  <input type="email" name="customerEmail" value={formData.customerEmail}
                    onChange={handleInputChange} placeholder="your@email.com"
                    className={vc('customerEmail')} required />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone * {highlighted.customerPhone && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                  </label>
                  <div className="flex">
                    <span className={`border border-r-0 rounded-l-md px-3 py-3 text-sm ${
                      isDark 
                        ? 'border-dark-border bg-gray-800 text-gray-400' 
                        : 'border-gray-300 bg-gray-50 text-gray-500'
                    }`}>+60</span>
                    <input type="tel" name="customerPhone" value={formData.customerPhone}
                      onChange={handleInputChange} placeholder="012-3456789"
                      className={`flex-1 border rounded-r-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500 ${
                        highlighted.customerPhone 
                          ? 'border-green-500 ring-2 ring-green-400 bg-green-50' 
                          : isDark 
                            ? 'border-dark-border bg-dark-bg text-white' 
                            : 'border-gray-300 bg-white'
                      }`} required />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Property Type * {highlighted.propertyType && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                  </label>
                  <select name="propertyType" value={formData.propertyType} onChange={handleInputChange}
                    className={vc('propertyType')} required>
                    <option value="">Select type</option>
                    <option value="apartment">Apartment/Condo</option>
                    <option value="terrace">Terrace House</option>
                    <option value="semi-d">Semi-Detached</option>
                    <option value="bungalow">Bungalow</option>
                    <option value="commercial">Commercial/Office</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Service Address * {highlighted.customerAddress && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                  </label>
                  
                  <div className="relative">
                    <input
                      ref={addressInputRef}
                      type="text"
                      name="customerAddress"
                      value={formData.customerAddress}
                      onChange={handleInputChange}
                      placeholder="Start typing your address or click the location button"
                      className={`w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-500 ${
                        highlighted.customerAddress 
                          ? 'border-green-500 ring-2 ring-green-400 bg-green-50' 
                          : isDark 
                            ? 'border-dark-border bg-dark-bg text-white' 
                            : 'border-gray-300 bg-white'
                      }`}
                      required
                    />
                    
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors group ${
                        isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                      title="Use my current location"
                    >
                      {isGettingLocation ? (
                        <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      ) : (
                        <MapPin className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'} group-hover:scale-110 transition-transform`} />
                      )}
                    </button>
                  </div>
                  
                  {formData.customerAddress?.length > 10 && (
                    <div className="mt-3">
                      <button type="button" onClick={() => setShowMap(!showMap)}
                        className={`flex items-center gap-1.5 text-sm ${
                          isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                        }`}>
                        <MapPin className="w-4 h-4" /> {showMap ? 'Hide map' : 'Show on map'}
                      </button>
                      {showMap && (
                        <div className={`mt-2 rounded-lg overflow-hidden border ${
                          isDark ? 'border-dark-border' : 'border-gray-200'
                        }`}>
                          <iframe title="map" width="100%" height="250" frameBorder="0"
                            src={`https://www.google.com/maps?q=${encodeURIComponent(formData.customerAddress)}&output=embed`}
                            allowFullScreen loading="lazy" />
                          <div className={`px-3 py-2 flex justify-between items-center border-t ${
                            isDark ? 'bg-gray-800 border-dark-border' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <span className={`text-xs truncate max-w-[60%] ${
                              isDark ? 'text-gray-400' : 'text-gray-500'
                            }`}>📍 {formData.customerAddress}</span>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.customerAddress)}`}
                              target="_blank" rel="noopener noreferrer"
                              className={`text-xs font-medium flex items-center gap-1 ${
                                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                              }`}>
                              Open Maps <ArrowRight className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className={`rounded-xl shadow-sm p-6 ${
              isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-semibold mb-6 pb-3 border-b ${
                isDark ? 'text-white border-dark-border' : 'text-[#0F172A] border-gray-200'
              }`}>Service Details</h2>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Service * {highlighted.serviceType && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                    </label>
                    <select name="serviceType" value={formData.serviceType} onChange={handleInputChange}
                      className={vc('serviceType')} required>
                      <option value="">Select service</option>
                      {services.map(s => <option key={s.id} value={s.name}>{s.name} — RM {s.basePrice}</option>)}
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Urgency {highlighted.urgencyLevel && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                    </label>
                    <select name="urgencyLevel" value={formData.urgencyLevel} onChange={handleInputChange} className={vc('urgencyLevel')}>
                      <option value="LOW">Low priority</option>
                      <option value="MEDIUM">Normal (within 3 days)</option>
                      <option value="HIGH">High priority (+RM 50)</option>
                      <option value="URGENT">Emergency — same day (+RM 100)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Issue Description *</label>
                  <textarea rows={4} name="issueDescription" value={formData.issueDescription}
                    onChange={handleInputChange} placeholder="Describe the problem..."
                    className={vc('issueDescription')} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Date * {highlighted.preferredDate && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                    </label>
                    <input type="date" name="preferredDate" value={formData.preferredDate}
                      onChange={handleInputChange} min={new Date().toISOString().split('T')[0]}
                      className={vc('preferredDate')} required />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Time * {highlighted.preferredTime && <span className="text-green-600 text-xs">✓ Voice filled</span>}
                    </label>
                    <select name="preferredTime" value={formData.preferredTime} onChange={handleInputChange}
                      className={vc('preferredTime')} required>
                      <option value="">Select time</option>
                      {generateTimeSlots().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Previous Service</label>
                    <select name="previousService" value={formData.previousService} onChange={handleInputChange}
                      className={`w-full border rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-dark-bg border-dark-border text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}>
                      <option value="no">No previous service</option>
                      <option value="same-company">This company before</option>
                      <option value="other-company">Another company</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Warranty Status</label>
                    <select name="warrantyStatus" value={formData.warrantyStatus} onChange={handleInputChange}
                      className={`w-full border rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-dark-bg border-dark-border text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}>
                      <option value="none">No warranty</option>
                      <option value="manufacturer">Manufacturer</option>
                      <option value="extended">Extended</option>
                      <option value="service">Service warranty</option>
                    </select>
                  </div>
                </div>

                {/* File uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[{ key: 'issuePhoto', label: 'Issue Photo', id: 'issue-upload' },
                    { key: 'warrantyPhoto', label: 'Warranty Card', id: 'warranty-upload' }].map(({ key, label, id }) => (
                    <div key={key}>
                      <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label} (optional)</label>
                      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        files[key] 
                          ? 'border-green-500' 
                          : isDark 
                            ? 'border-dark-border hover:border-blue-500' 
                            : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        <input type="file" id={id} className="hidden" accept=".jpg,.jpeg,.png" onChange={e => handleFileChange(e, key)} />
                        {files[key] ? (
                          <div>
                            {filePreviews[key] && <img src={filePreviews[key]} className="max-h-24 mx-auto rounded mb-2" alt="preview" />}
                            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{files[key].name}</p>
                            <button type="button" onClick={() => removeFile(key)} className="text-red-500 text-xs mt-1">Remove</button>
                          </div>
                        ) : (
                          <label htmlFor={id} className="cursor-pointer block py-3">
                            <svg className={`mx-auto h-10 w-10 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Click to upload</p>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Special Requests</label>
                  <textarea rows={3} name="specialRequests" value={formData.specialRequests}
                    onChange={handleInputChange} placeholder="Any additional notes..."
                    className={`w-full border rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-dark-bg border-dark-border text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`} />
                </div>
              </div>
            </div>

            {/* Coupon Section with My Coupons Dropdown */}
            <div className={`rounded-xl shadow-sm p-6 ${
              isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>🎟️ Promo Code</h2>
                
                {/* My Coupons Button */}
                {userCoupons.length > 0 && !couponResult && (
                  <button
                    type="button"
                    onClick={() => setShowCouponDropdown(!showCouponDropdown)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                      isDark 
                        ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    <Tag size={14} />
                    <span>My Coupons ({userCoupons.length})</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCouponDropdown ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Have a discount code?</p>

              {/* My Coupons Dropdown */}
              {showCouponDropdown && userCoupons.length > 0 && (
                <div className={`mb-4 border rounded-xl overflow-hidden ${
                  isDark ? 'border-blue-800' : 'border-blue-100'
                }`}>
                  <div className={`px-4 py-2 text-xs font-medium border-b ${
                    isDark 
                      ? 'bg-gray-800 text-blue-400 border-blue-800' 
                      : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    Your Available Coupons
                  </div>
                  <div className={`max-h-60 overflow-y-auto divide-y ${
                    isDark ? 'divide-dark-border' : 'divide-gray-100'
                  }`}>
                    {loadingCoupons ? (
                      <div className="p-4 text-center">
                        <Loader2 className={`w-5 h-5 animate-spin mx-auto ${
                          isDark ? 'text-blue-400' : 'text-blue-600'
                        }`} />
                      </div>
                    ) : (
                      userCoupons.map(coupon => (
                        <div
                          key={coupon.id}
                          onClick={() => handleSelectCoupon(coupon)}
                          className={`p-3 cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                                isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-900'
                              }`}>
                                {coupon.code}
                              </span>
                              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{coupon.name}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-semibold ${
                                isDark ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {coupon.type === 'PERCENTAGE' ? `${coupon.value}% OFF` :
                                 coupon.type === 'FIXED' ? `RM${coupon.value} OFF` :
                                 'FREE SERVICE'}
                              </span>
                              {coupon.minPurchase > 0 && (
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Min. RM{coupon.minPurchase}</p>
                              )}
                            </div>
                          </div>
                          {coupon.validUntil && (
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              Valid until: {new Date(coupon.validUntil).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {couponResult?.success ? (
                <div className={`border rounded-xl p-4 flex items-center justify-between ${
                  isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                }`}>
                  <div>
                    <p className={`font-mono font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      {couponResult.coupon.code} <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                      }`}>Applied</span>
                    </p>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                      You save: RM {Number(couponResult.discountAmount).toFixed(2)}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setCouponResult(null); setCouponCode(''); }} className="text-red-400 text-sm underline">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="e.g. SAVE20" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                    className={`flex-1 border rounded-lg px-4 py-3 font-mono uppercase text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-dark-bg border-dark-border text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`} />
                  <button type="button" onClick={handleApplyCoupon} disabled={!couponCode || couponLoading}
                    className={`px-5 py-3 rounded-lg font-medium disabled:opacity-50 min-w-[80px] ${
                      isDark
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-[#0F172A] hover:bg-[#1E293B] text-white'
                    }`}>
                    {couponLoading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Apply'}
                  </button>
                </div>
              )}
              {couponError && <p className="text-red-500 text-sm mt-2">❌ {couponError}</p>}
            </div>
          </div>

          {/* RIGHT COLUMN - Summary */}
          <div className="space-y-6">
            <div className={`rounded-xl shadow-sm p-6 sticky top-6 ${
              isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
            }`}>
              <h3 className={`font-semibold mb-4 text-lg ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Booking Summary</h3>
              {company && (
                <div>
                  <div className={`flex items-center gap-3 pb-4 border-b mb-4 ${
                    isDark ? 'border-dark-border' : 'border-gray-200'
                  }`}>
                    <img src={company.logo || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop'}
                      alt={company.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{company.name}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>⭐ {company.rating?.toFixed(1)} ({company.totalReviews} reviews)</p>
                    </div>
                  </div>
                  
                  {/* Price Breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Base fee:</span>
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>
                        {pricing.basePrice > 0 ? `RM ${pricing.basePrice.toFixed(2)}` : '—'}
                      </span>
                    </div>
                    {pricing.urgencyFee > 0 && (
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Priority fee:</span>
                        <span className="text-orange-500">+RM {pricing.urgencyFee.toFixed(2)}</span>
                      </div>
                    )}
                    {pricing.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-green-400' : 'text-green-600'}>Discount:</span>
                        <span className={isDark ? 'text-green-400' : 'text-green-600'}>−RM {pricing.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className={`flex justify-between pt-3 border-t font-bold text-base ${
                      isDark ? 'border-dark-border' : 'border-gray-200'
                    }`}>
                      <span className={isDark ? 'text-white' : 'text-gray-900'}>Total:</span>
                      <span className={pricing.isWarrantyFree ? 'text-green-500' : isDark ? 'text-white' : 'text-gray-900'}>
                        {pricing.isWarrantyFree ? 'FREE' : `RM ${pricing.finalPrice.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  {!pricing.isWarrantyFree && (
                    <div className="mt-6 pt-4 border-t">
                      <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Payment Method
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'card' }))}
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                            formData.paymentMethod === 'card' 
                              ? isDark
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-[#0F172A] bg-[#0F172A] text-white'
                              : isDark
                                ? 'border-dark-border hover:border-blue-600 text-gray-300'
                                : 'border-gray-300 hover:border-gray-400 text-gray-700'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm font-medium">Credit Card</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                            formData.paymentMethod === 'cash' 
                              ? isDark
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-[#0F172A] bg-[#0F172A] text-white'
                              : isDark
                                ? 'border-dark-border hover:border-blue-600 text-gray-300'
                                : 'border-gray-300 hover:border-gray-400 text-gray-700'
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span className="text-sm font-medium">Cash</span>
                        </button>
                      </div>
                      {formData.paymentMethod === 'cash' && (
                        <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          Pay cash to technician upon service completion
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`rounded-xl shadow-sm p-6 ${
              isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
            }`}>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Terms</h3>
              <ul className={`text-sm space-y-1.5 mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <li>• Payment due upon service completion</li>
                <li>• Cancellation within 24h may incur fee</li>
                <li>• Technician calls 30min before arrival</li>
                <li>• Prices may vary after diagnosis</li>
              </ul>
              <div className="flex items-start gap-3">
                <input type="checkbox" id="terms" required className="mt-1 h-4 w-4" />
                <label htmlFor="terms" className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  I agree to the terms and authorize the service provider to contact me.
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className={`w-full font-semibold py-4 rounded-xl shadow-md transition-all duration-200 ${
                isDark
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
                  : 'bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white hover:opacity-90'
              } disabled:opacity-50`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin w-5 h-5" /> Submitting...
                </span>
              ) : pricing.isWarrantyFree ? (
                'Confirm Free Service'
              ) : formData.paymentMethod === 'cash' ? (
                `Book Now — Pay RM ${pricing.finalPrice.toFixed(2)} in Cash`
              ) : (
                `Book Now — RM ${pricing.finalPrice.toFixed(2)}`
              )}
            </button>

            <div className={`rounded-xl p-5 ${
              isDark ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Need Help?</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>📞 {company?.phone || '+60-17-3264292'}</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>✉️ {company?.email || 'support@homez.com'}</p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>9AM – 8PM daily</p>
            </div>
          </div>
        </div>
      </form>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}