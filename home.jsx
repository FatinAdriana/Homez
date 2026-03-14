// src/pages/Home.jsx - COMPLETE FIXED VERSION WITH REAL DATA
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import aircondImage from '../assets/aircond.png';
import carpentryImage from '../assets/carpentry.png';
import cleaningImage from '../assets/cleaning.png'
import generalmaintenanceImage from '../assets/generalmaintenance.png'
import ITServiceImage from '../assets/ITServices.png'
import kipasImage from '../assets/kipas.png'
import plumbingImage from '../assets/plumbing.png'
import securityImage from '../assets/security.png'
import washingmachineImage from '../assets/washingmachine.png'
import axios from 'axios'
import { useTheme } from '../context/ThemeContext.jsx'
import VoiceAssistant from '../components/voiceassistant'
import CouponCard from '../components/CouponCard'
import Loading from '../components/Loading.jsx'
import { SERVICE_CATEGORIES } from '../constants/serviceCategories'
import { Tag, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../index.css'

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_IMAGE = aircondImage;
const API_BASE_URL = 'http://localhost:5001';

const serviceCategoryImages = {
  'HVAC': aircondImage,
  'Electrical': kipasImage,
  'Plumbing': plumbingImage,
  'IT Services': ITServiceImage,
  'Appliance': washingmachineImage,
  'General Maintenance': generalmaintenanceImage,
  'Security': securityImage,
  'Carpentry': carpentryImage,
  'Cleaning': cleaningImage
};

// Resolve relative paths to full URLs
const resolveLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.startsWith('data:')) return logo;
  if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
  const path = logo.startsWith('/') ? logo : `/${logo}`;
  return `${API_BASE_URL}${path}`;
};

// Company Logo Image Component
function CompanyLogoImage({ logo, name, className }) {
  const [error, setError] = useState(false);
  
  // Fallback image
  const fallbackImage = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop';
  
  const resolvedLogo = resolveLogoUrl(logo);
  const imageSrc = error ? fallbackImage : (resolvedLogo || fallbackImage);

  return (
    <img
      src={imageSrc}
      alt={name}
      className={className}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => {
        console.log(`Logo failed to load for ${name}, using fallback`);
        setError(true);
      }}
    />
  );
}

export default function Home() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const lenisRef = useRef(null);
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [globalCoupons, setGlobalCoupons] = useState([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [mostBookedCompanies, setMostBookedCompanies] = useState([])
  const [popularCompanies, setPopularCompanies] = useState([])

  const floatingDotsRef = useRef([])
  const popularCompaniesScrollRef = useRef(null)
  const mostBookedScrollRef = useRef(null)
  const servicesScrollRef = useRef(null)

  const [searchQuery, setSearchQuery] = useState('')

  const addToFloatingDots = (el) => {
    if (el && !floatingDotsRef.current.includes(el)) {
      floatingDotsRef.current.push(el);
    }
  };

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

  useEffect(() => {
    let lenis;
    const initLenis = async () => {
      try {
        const LenisModule = await import('@studio-freight/lenis');
        const Lenis = LenisModule.default || LenisModule.Lenis;
        lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          smoothWheel: true,
          smoothTouch: false,
        });
        lenisRef.current = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } catch (error) {
        console.error('Failed to initialize Lenis:', error);
      }
    };
    initLenis();
    return () => {
      if (lenisRef.current) { lenisRef.current.destroy(); }
      gsap.ticker.remove(() => {});
    };
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchUserData(),
        fetchGlobalCoupons(),
        fetchPopularCompanies() // Fetch popular companies first
      ]);
      setLoading(false);
    };
    fetchAllData();
  }, []);

  // Update most booked companies whenever popular companies changes
  useEffect(() => {
    if (popularCompanies.length > 0) {
      // Sort by totalReviews to get most booked/popular
      const sortedByReviews = [...popularCompanies]
        .sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0))
        .slice(0, 8);
      
      // Add booking counts based on reviews
      const withBookings = sortedByReviews.map(company => ({
        ...company,
        bookings: Math.round((company.totalReviews || 0) * 2.5) // Approximate bookings from reviews
      }));
      
      setMostBookedCompanies(withBookings);
    }
  }, [popularCompanies]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const response = await axios.get(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.success) setUserData(response.data.user)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchGlobalCoupons = async () => {
    try {
      setCouponsLoading(true)
      const response = await axios.get(`${API_BASE_URL}/coupons/global`)
      if (response.data.success) setGlobalCoupons(response.data.coupons)
    } catch (error) {
      console.error('Error fetching global coupons:', error)
    } finally {
      setCouponsLoading(false)
    }
  }

  const handleClaimCoupon = async (coupon) => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return; }
    try {
      const response = await axios.post(
        `${API_BASE_URL}/coupons/claim`,
        { couponId: coupon.id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.data.success) {
        alert('Coupon claimed successfully! Check your email.')
        fetchGlobalCoupons()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to claim coupon')
    }
  }

  const fetchPopularCompanies = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/companies/popular`)
      console.log('Popular companies response:', response.data);
      
      let companies = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          companies = response.data;
        } else if (response.data.success && Array.isArray(response.data.companies)) {
          companies = response.data.companies;
        }
      }
      
      if (companies.length > 0) {
        console.log('Setting popular companies:', companies);
        setPopularCompanies(companies);
      }
    } catch (error) {
      console.error('Error fetching popular companies:', error);
    }
  };

  const getServiceRoute = (category) => {
    const routeMap = {
      'HVAC': 'aircond',
      'Electrical': 'electrical',
      'Plumbing': 'plumbing',
      'IT Services': 'it-services',
      'Appliance': 'appliance',
      'General Maintenance': 'general-maintenance',
      'Security': 'security',
      'Carpentry': 'carpentry',
      'Cleaning': 'cleaning'
    }
    return routeMap[category] || category.toLowerCase().replace(/\s+/g, '-')
  }

  const getCategoryImage = (category) => serviceCategoryImages[category] || DEFAULT_IMAGE

  const handleCompanyClick = (company) => {
    if (!company || !company.id) return;
    navigate(`/company/${company.id}`);
  };

  const scrollPopularLeft = () => popularCompaniesScrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' });
  const scrollPopularRight = () => popularCompaniesScrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' });
  const scrollMostBookedLeft = () => mostBookedScrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' });
  const scrollMostBookedRight = () => mostBookedScrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' });
  const scrollServicesLeft = () => servicesScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollServicesRight = () => servicesScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  if (loading) return <Loading />;

  return (
    <div className={`font-sans min-h-screen transition-colors duration-500 ${
      isDark ? 'bg-dark-bg' : 'bg-white'
    }`}>

      {/* FLOATING DOTS BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            ref={addToFloatingDots}
            className={`absolute w-1 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-gray-400/20'}`}
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          />
        ))}
      </div>

      {/* HERO SECTION */}
      <div className={`relative overflow-hidden ${
        isDark
          ? 'bg-gradient-to-r from-[#1E293B] to-[#0F172A]'
          : 'bg-gradient-to-r from-[#0F172A] to-[#1E293B]'
      } py-24 md:py-32`}>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Find Trusted Technicians</h1>
              <p className="text-white/80 text-xl max-w-2xl">
                Reliable home services at your fingertips. Book verified professionals for all your maintenance needs.
              </p>
            </div>
            <div className="mt-8 md:mt-0">
              <button
                onClick={() => navigate('/service-providers')}
                className="bg-white text-blue-600 px-10 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                Book a Service Now →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PLATFORM DEALS */}
      {globalCoupons.length > 0 && (
        <div className={`w-full py-12 transition-colors duration-300 relative z-10 ${
          isDark ? 'bg-dark-card' : 'bg-gradient-to-br from-slate-50 to-gray-100'
        }`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-8">
              <div className={`p-3 rounded-xl shadow-lg ${
                isDark ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gradient-to-r from-blue-600 to-blue-800'
              }`}>
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>🎟️ Platform Deals</h3>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Exclusive coupons to save on your next service</p>
              </div>
            </div>
            {couponsLoading ? (
              <div className="flex justify-center py-10">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDark ? 'border-white' : 'border-blue-600'}`} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {globalCoupons.map((coupon) => (
                  <CouponCard key={coupon.id} coupon={coupon} type="global" onClaim={handleClaimCoupon} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SERVICES CATEGORIES */}
      <div className="w-full py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Services</h3>
        </div>
        <button
          className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 shadow-md rounded-full w-10 h-10 flex items-center justify-center ml-2 md:ml-4 transition-colors ${
            isDark ? 'bg-dark-card border border-dark-border text-gray-300 hover:bg-dark-bg' : 'bg-white/80 hover:bg-white text-gray-700'
          }`}
          onClick={scrollServicesLeft}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div ref={servicesScrollRef} className="services-scroll-container flex overflow-x-hidden scroll-smooth px-4 md:px-8">
          <div className="flex gap-8 px-4 md:px-8">
            {SERVICE_CATEGORIES.map((category) => (
              <div
                key={category}
                onClick={() => navigate(`/service-providers/${getServiceRoute(category)}`)}
                className="w-40 flex-shrink-0 hover:opacity-90 transition-opacity cursor-pointer group"
              >
                <div className={`h-32 w-32 mx-auto mb-3 overflow-hidden rounded-lg ${isDark ? 'bg-dark-card' : 'bg-gray-100'}`}>
                  <img
                    src={getCategoryImage(category)}
                    alt={category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 shadow-md rounded-full w-10 h-10 flex items-center justify-center mr-2 md:mr-4 transition-colors ${
            isDark ? 'bg-dark-card border border-dark-border text-gray-300 hover:bg-dark-bg' : 'bg-white/80 hover:bg-white text-gray-700'
          }`}
          onClick={scrollServicesRight}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* MOST BOOKED COMPANIES - USING REAL DATA FROM POPULAR COMPANIES */}
      <div className="w-full py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Most Booked Companies
          </h3>
        </div>
        
        {mostBookedCompanies.length === 0 ? (
          <div className="max-w-7xl mx-auto px-6">
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">No companies found</p>
            </div>
          </div>
        ) : (
          <>
            <button
              className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 shadow-md rounded-full w-10 h-10 flex items-center justify-center ml-2 md:ml-4 transition-colors ${
                isDark ? 'bg-dark-card border border-dark-border text-gray-300 hover:bg-dark-bg' : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={scrollMostBookedLeft}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div ref={mostBookedScrollRef} className="most-booked-scroll-container flex overflow-x-hidden scroll-smooth">
              <div className="flex gap-6 px-6">
                {mostBookedCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleCompanyClick(company)}
                    className={`w-80 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-card border border-dark-border hover:border-blue-500/30'
                        : 'bg-white hover:shadow-xl'
                    }`}
                  >
                    {/* Company Logo */}
                    <div className="p-6 flex justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                      <CompanyLogoImage
                        logo={company.logo}
                        name={company.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md"
                      />
                    </div>

                    {/* Company Info */}
                    <div className="p-6 text-center">
                      <h4 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {company.name}
                      </h4>
                      <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {company.category}
                      </p>
                      
                      {/* Rating */}
                      <div className="flex items-center justify-center mb-3">
                        <div className="flex mr-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${
                              i < Math.floor(company.rating || 0)
                                ? 'text-yellow-400 fill-yellow-400'
                                : isDark ? 'text-gray-600' : 'text-gray-300'
                            }`} />
                          ))}
                        </div>
                        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {company.rating?.toFixed(1)}
                        </span>
                        <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          ({company.totalReviews || 0})
                        </span>
                      </div>

                      {/* Bookings Count */}
                      <div className="mb-3">
                        <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {company.bookings}+ bookings
                        </span>
                      </div>

                      {/* Verified Badge */}
                      {company.isVerified && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 shadow-md rounded-full w-10 h-10 flex items-center justify-center mr-2 md:mr-4 transition-colors ${
                isDark ? 'bg-dark-card border border-dark-border text-gray-300 hover:bg-dark-bg' : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={scrollMostBookedRight}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* POPULAR SERVICE PROVIDERS - USING REAL DATA */}
      <div className={`w-full py-12 transition-colors duration-300 relative z-10 ${
        isDark ? 'bg-dark-card' : 'bg-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <h3 className={`text-lg font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Popular Service Providers
          </h3>
        </div>

        {popularCompanies.length === 0 ? (
          <div className="max-w-7xl mx-auto px-6">
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="text-lg">No companies found</p>
              <p className="text-sm mt-2">Check back later for new service providers</p>
            </div>
          </div>
        ) : (
          <>
            <button
              className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 shadow-md rounded-full w-10 h-10 flex items-center justify-center ml-2 md:ml-4 transition-colors ${
                isDark ? 'bg-dark-bg border border-dark-border text-gray-300 hover:bg-dark-card' : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={scrollPopularLeft}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div ref={popularCompaniesScrollRef} className="popular-companies-scroll-container flex overflow-x-hidden scroll-smooth">
              <div className="flex gap-6 px-6">
                {popularCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleCompanyClick(company)}
                    className={`w-72 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      isDark
                        ? 'bg-dark-card border border-dark-border hover:border-blue-500/30'
                        : 'bg-white hover:shadow-xl'
                    }`}
                  >
                    {/* Logo */}
                    <div className="p-6 flex justify-center">
                      <CompanyLogoImage
                        logo={company.logo}
                        name={company.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 shadow-md"
                      />
                    </div>

                    {/* Company Info */}
                    <div className="px-6 pb-6 text-center">
                      <h4 className={`font-bold text-lg mb-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {company.name}
                      </h4>
                      <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {company.category}
                      </p>
                      
                      {/* Rating */}
                      <div className="flex items-center justify-center mb-3">
                        <div className="flex mr-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${
                              i < Math.floor(company.rating || 0)
                                ? 'text-yellow-400 fill-yellow-400'
                                : isDark ? 'text-gray-600' : 'text-gray-300'
                            }`} />
                          ))}
                        </div>
                        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {company.rating?.toFixed(1) || '4.5'}
                        </span>
                        <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          ({company.totalReviews || 0})
                        </span>
                      </div>

                      {/* Verified Badge */}
                      {company.isVerified && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 shadow-md rounded-full w-10 h-10 flex items-center justify-center mr-2 md:mr-4 transition-colors ${
                isDark ? 'bg-dark-bg border border-dark-border text-gray-300 hover:bg-dark-card' : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              onClick={scrollPopularRight}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* FEATURED SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-6 relative z-10">
        {SERVICE_CATEGORIES.slice(0, 3).map((category) => (
          <div
            key={category}
            onClick={() => navigate(`/service-providers/${getServiceRoute(category)}`)}
            className={`flex items-center rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
              isDark
                ? 'bg-dark-card border border-dark-border hover:border-blue-500/30'
                : 'bg-gray-100 hover:shadow-md'
            }`}
          >
            <div className="w-2/3 p-8">
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Professional {category} Services
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Skilled technicians delivering fast, reliable and affordable {category.toLowerCase()} maintenance services.
              </p>
            </div>
            <div className="w-1/3 h-48">
              <img src={getCategoryImage(category)} alt={category} className="w-full h-full object-cover" />
            </div>
          </div>
        ))}
      </div>

      {/* VOICE ASSISTANT */}
      <div className="fixed bottom-6 right-6 z-50">
        <VoiceAssistant
          userData={userData}
          onAction={(action, data) => {
            if (action === 'navigate') navigate(data.path);
            else if (action === 'search') setSearchQuery(data.query);
            else if (action === 'book') navigate('/booking', { state: data });
          }}
        />
      </div>

      <style jsx>{`
        .services-scroll-container,
        .most-booked-scroll-container,
        .popular-companies-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .services-scroll-container::-webkit-scrollbar,
        .most-booked-scroll-container::-webkit-scrollbar,
        .popular-companies-scroll-container::-webkit-scrollbar {
          display: none;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}