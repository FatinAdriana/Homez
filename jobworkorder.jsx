// JobWorkOrder.jsx - COMPLETE WITH TECHNICIAN LIVE TRACKING AND DARK MODE
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTheme } from '../context/ThemeContext'
import io from 'socket.io-client'
import BookingDetailsPanel from './bookingdetailspanel'
import {
  Clock, MapPin, User, Phone, Mail,
  ChevronLeft, ChevronRight, Search, X,
  Play, Pause, StopCircle, Camera,
  Upload, CheckCircle, AlertCircle,
  FileText, Download, Printer,
  Package, Plus, Minus, Filter,
  MessageSquare, Navigation, Star,
  Calendar, Clock as ClockIcon, Wrench,
  Shield, Award, Users, Home,
  CheckSquare, Square, Camera as CameraIcon,
  PenTool, FileSignature, ClipboardCheck,
  History, Info, Settings, Save,
  ArrowLeft, ArrowRight, ChevronDown,
  MoreVertical, Trash2, Edit2,
  Loader2, AlertTriangle, Check, RefreshCw,
  Home as HomeIcon,
  BarChart3,
  LogOut,
  Bell,
  ChevronDown as ChevronDownIcon,
  Award as AwardIcon,
  Wifi, WifiOff, Navigation as NavigationIcon
} from 'lucide-react'

// ============================================
// TECHNICIAN LIVE TRACKER COMPONENT - WITH DARK MODE
// ============================================
const TechnicianLiveTracker = ({ jobId, customerAddress, onTrackingActive }) => {
  const { isDark } = useTheme()
  const [watchId, setWatchId] = useState(null);
  const lenisRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [statusMessage, setStatusMessage] = useState('Preparing to share location...');
  const [shareWithCustomer, setShareWithCustomer] = useState(true);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLocationError('');
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLocationError('Internet connection lost');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

    /* ── Lenis smooth scroll with GSAP integration ── */
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

        // Connect Lenis to GSAP's ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);
        
        // Use GSAP's ticker for smooth animation
        gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });
        
        gsap.ticker.lagSmoothing(0);
        
      } catch (error) {
        console.error('Failed to initialize Lenis:', error);
      }
    };
    
    initLenis();
    
    return () => {
      if (lenisRef.current) {
        lenisRef.current.destroy();
      }
      gsap.ticker.remove(() => {});
    };
  }, []);

  // Connect to socket and start tracking
  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      setLocationError('No authentication token');
      return;
    }

    // Connect to socket
    const newSocket = io('http://localhost:5001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Technician socket connected');
      
      // Join technician room
      newSocket.emit('technician-connect', { jobId });
      setStatusMessage('Connected to tracking server');
    });

    newSocket.on('technician-connected', (data) => {
      console.log('✅ Connected to tracking server:', data);
      setStatusMessage('Connected to tracking server');
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
      setLocationError('Failed to connect to server');
    });

    // Start watching position
    if (navigator.geolocation) {
      setStatusMessage('Requesting location access...');
      
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setAccuracy(Math.round(accuracy));
          setLastUpdated(new Date());
          setLocationError('');
          
          // Update status
          setStatusMessage(shareWithCustomer ? 'Sharing live location with customer' : 'Tracking active (not sharing)');
          
          console.log('📍 Current position:', { latitude, longitude, accuracy });
          
          // Send location to server every 5 seconds if sharing is enabled
          if (shareWithCustomer) {
            newSocket.emit('technician-location-update', {
              jobId,
              location: { lat: latitude, lng: longitude },
              accuracy: Math.round(accuracy),
              timestamp: new Date(),
              status: 'on-the-way'
            });
            
            // Also emit status update
            newSocket.emit('technician-status-update', {
              jobId,
              status: 'on-the-way',
              message: 'Technician is on the way to your location',
              timestamp: new Date()
            });
            
            setTrackingActive(true);
            if (onTrackingActive) onTrackingActive(true);
          }
        },
        (error) => {
          console.error('📍 Geolocation error:', error);
          setTrackingActive(false);
          
          let errorMsg = 'Location error';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Please enable location access to share your position';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out';
              break;
            default:
              errorMsg = 'Failed to get location';
          }
          setLocationError(errorMsg);
          setStatusMessage(errorMsg);
          
          if (onTrackingActive) onTrackingActive(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
      
      setWatchId(id);
    } else {
      setLocationError('Geolocation is not supported by your browser');
      setStatusMessage('Geolocation not supported');
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (newSocket) {
        newSocket.emit('technician-disconnect', { jobId });
        newSocket.disconnect();
      }
    };
  }, [jobId, shareWithCustomer]);

  const toggleSharing = () => {
    setShareWithCustomer(!shareWithCustomer);
    
    // Notify server of sharing status change
    if (socket) {
      socket.emit('technician-sharing-toggle', {
        jobId,
        sharing: !shareWithCustomer
      });
    }
  };

  const sendArrivalNotification = () => {
    if (socket) {
      socket.emit('technician-status-update', {
        jobId,
        status: 'arrived',
        message: 'Technician has arrived at your location',
        timestamp: new Date()
      });
      alert('✅ Arrival notification sent to customer');
    }
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${
      isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {trackingActive && isOnline ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full absolute top-0 animate-ping opacity-75"></div>
              </>
            ) : (
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            )}
          </div>
          <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Live Location Tracking
          </h3>
        </div>
        
        {!isOnline && (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'
          }`}>
            <WifiOff size={14} />
            <span className="text-xs font-medium">Offline</span>
          </div>
        )}
      </div>

      {/* Status Message */}
      <div className={`mb-4 p-3 rounded-lg ${
        locationError 
          ? isDark ? 'bg-red-900/20' : 'bg-red-50'
          : trackingActive 
            ? isDark ? 'bg-green-900/20' : 'bg-green-50'
            : isDark ? 'bg-blue-900/20' : 'bg-blue-50'
      }`}>
        <div className="flex items-start gap-2">
          {locationError ? (
            <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              isDark ? 'text-red-400' : 'text-red-600'
            }`} />
          ) : trackingActive ? (
            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`} />
          ) : (
            <Loader2 className={`w-4 h-4 mt-0.5 flex-shrink-0 animate-spin ${
              isDark ? 'text-blue-400' : 'text-blue-600'
            }`} />
          )}
          <div>
            <p className={`text-sm ${
              locationError 
                ? isDark ? 'text-red-400' : 'text-red-700'
                : trackingActive 
                  ? isDark ? 'text-green-400' : 'text-green-700'
                  : isDark ? 'text-blue-400' : 'text-blue-700'
            }`}>
              {locationError || statusMessage}
            </p>
            {accuracy && trackingActive && (
              <p className={`text-xs mt-1 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Accuracy: ±{accuracy} meters
              </p>
            )}
            {lastUpdated && trackingActive && (
              <p className={`text-xs ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tracking Controls */}
      <div className="space-y-3">
        {/* Share Toggle */}
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          isDark ? 'bg-dark-bg' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            <NavigationIcon className={`w-4 h-4 ${shareWithCustomer ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Share with customer</span>
          </div>
          <button
            onClick={toggleSharing}
            disabled={!trackingActive || !!locationError}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              shareWithCustomer && trackingActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
            } ${(!trackingActive || locationError) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                shareWithCustomer && trackingActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* On My Way Button */}
        <button
          onClick={() => {
            if (socket) {
              socket.emit('technician-status-update', {
                jobId,
                status: 'on-the-way',
                message: 'Technician is on the way to your location',
                timestamp: new Date()
              });
              alert('✅ "On the way" notification sent to customer');
            }
          }}
          disabled={!trackingActive || !shareWithCustomer}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Navigation className="w-4 h-4" />
          <span className="font-medium">Send "On My Way"</span>
        </button>

        {/* Arrived Button */}
        <button
          onClick={sendArrivalNotification}
          disabled={!trackingActive || !shareWithCustomer}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">I've Arrived</span>
        </button>

        {/* Customer Address Preview */}
        {customerAddress && (
          <div className={`mt-4 p-3 rounded-lg border ${
            isDark ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-100'
          }`}>
            <p className={`text-xs mb-1 ${
              isDark ? 'text-purple-400' : 'text-purple-600'
            }`}>Destination:</p>
            <p className={`text-sm font-medium ${
              isDark ? 'text-white' : 'text-gray-700'
            }`}>{customerAddress}</p>
          </div>
        )}
      </div>

      {/* Tracking Stats */}
      {trackingActive && shareWithCustomer && (
        <div className={`mt-4 pt-4 border-t ${
          isDark ? 'border-dark-border' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between text-sm">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Status:</span>
            <span className={`font-medium flex items-center gap-1 ${
              isDark ? 'text-green-400' : 'text-green-600'
            }`}>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Sharing with:</span>
            <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Customer</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function JobWorkOrder() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const { jobId } = useParams()
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  
  // Main state
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('work-order')
  const [saving, setSaving] = useState(false)
  const [technicianData, setTechnicianData] = useState(null)
  
  // Map state
  const [showMap, setShowMap] = useState(false)
  
  // Time tracker
  const [timeTracker, setTimeTracker] = useState({
    running: false,
    elapsed: 0,
    startTime: null,
    pauses: []
  })
  
  // Photos
  const [photos, setPhotos] = useState([])
  const photoInputRef = useRef(null)
  
  // Signature
  const [signature, setSignature] = useState(null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const signatureCanvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Completion checklist
  const [checklist, setChecklist] = useState([
    { id: 1, task: 'Service completed as requested', checked: false },
    { id: 2, task: 'All parts installed properly', checked: false },
    { id: 3, task: 'Work area cleaned up', checked: false },
    { id: 4, task: 'Customer briefed on work done', checked: false },
    { id: 5, task: 'Safety checks performed', checked: false },
    { id: 6, task: 'Photos taken (if required)', checked: false },
  ])
  
  // Service History
  const [serviceHistory, setServiceHistory] = useState([])
  
  // Notes for Future Tech
  const [futureTechNotes, setFutureTechNotes] = useState('')
  
  // Customer Notes
  const [customerNotes, setCustomerNotes] = useState('')
  
  // Progress tracking
  const [progress, setProgress] = useState({
    checklist: { completed: 0, total: 0, progress: 0, allChecked: false },
    canComplete: false
  })

  // Tracking state
  const [trackingActive, setTrackingActive] = useState(false);

  // Nav items for the main navbar
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/technician/technicianhome', icon: HomeIcon },
    { id: 'schedule', label: 'My Schedule', path: '/technician/myschedule', icon: Calendar },
    { 
      id: 'work-order', 
      label: 'Work Orders', 
      path: '/technician/jobworkorder/92ed6b43-c827-4631-a103-3febd0f96b39',
      icon: ClipboardCheck 
    },
    { id: 'settings', label: 'Settings', path: '/technician/techniciansettings', icon: Settings },
  ]

  const fetchWorkOrderData = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('userData')

      if (userData) {
        setTechnicianData(JSON.parse(userData))
      }

      console.log('🔍 Fetching work order - Job ID:', jobId)

      if (!token) {
        navigate('/login')
        return
      }

      const response = await fetch(`http://localhost:5001/jobs/technician/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || `Failed to fetch: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        const job = data.job

        setJob({
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          description: job.description,
          priority: job.priority,
          status: job.status,
          estimatedCost: job.estimatedCost,
          scheduledDate: job.scheduledDate,
          scheduledTime: job.scheduledTime,
          customer: {
            name: job.customerName || 'N/A',
            phone: job.customerPhone || 'N/A',
            email: job.customerEmail || 'N/A',
            address: job.customerAddress || 'N/A'
          },
          service: {
            type: job.serviceType,
            technician: job.assignedTechnician?.name || 'Not assigned',
            price: `RM ${job.estimatedCost?.toFixed(2) || '0.00'}`
          },
          booking: job.booking,
          product: job.product
        })

        if (job.checklist?.length > 0) {
          setChecklist(job.checklist.map((item, index) => ({
            id: item.id || index + 1,
            task: item.task,
            checked: item.checked || false,
            order: item.order || index + 1
          })))
        }

        if (job.photos?.length > 0) {
          setPhotos(job.photos.map(photo => ({
            id: photo.id,
            url: photo.url,
            name: photo.caption || 'Job Photo',
            timestamp: photo.createdAt
          })))
        }

        if (job.signature) {
          setSignature(job.signature.signature || job.signature)
        }

        if (job.timeTracker) {
          setTimeTracker({
            running: job.timeTracker.status === 'running',
            elapsed: job.timeTracker.totalSeconds || 0,
            startTime: job.timeTracker.startTime ? new Date(job.timeTracker.startTime) : null,
            pauses: job.timeTracker.pauses || []
          })
        }

        if (job.jobNotes?.length > 0) {
          setFutureTechNotes(job.jobNotes.map(note => note.content).join('\n'))
        }

        // Fetch service history separately
        try {
          const historyResponse = await fetch(`http://localhost:5001/jobs/history`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          })
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.success) setServiceHistory(historyData.history || [])
          }
        } catch (historyErr) {
          console.log('Could not fetch service history:', historyErr)
        }
      }
    } catch (err) {
      console.error('Error fetching work order:', err)
      setError(err.message || 'Failed to load work order data')
      if (process.env.NODE_ENV === 'development') {
        loadMockData()
      }
    } finally {
      setLoading(false)
    }
  }

  // Load mock data
  const loadMockData = () => {
    const mockJob = {
      id: jobId,
      jobNumber: `JOB-${jobId}`,
      title: 'AC Repair Service',
      description: 'Outdoor unit making loud noise, not cooling properly',
      priority: 'High',
      status: 'In Progress',
      estimatedCost: 280,
      scheduledDate: new Date(),
      scheduledTime: '10:00 AM',
      customer: {
        name: 'Ahmad Ali',
        phone: '+60 12-345 6789',
        email: 'ahmad.ali@example.com',
        address: '123 Main Street, Batu Pahat, Johor',
        specialInstructions: 'Gate code: 1234#. Park in designated spot only.',
      },
      service: {
        type: 'AC Repair',
        technician: 'John Doe',
        price: 'RM 280',
        estimatedDuration: 2,
        warranty: '90 days'
      },
      location: {
        type: 'Residential',
        floor: '2nd Floor',
        access: 'Front door, keys with neighbor',
        pets: 'Yes (2 cats)'
      },
      product: null
    }
    
    const mockServiceHistory = [
      {
        id: 'SH001',
        date: '2024-10-15',
        technician: 'Sarah Lee',
        service: 'AC Maintenance',
        description: 'Routine maintenance and cleaning',
        parts: ['AC Filter Set', 'Coil Cleaning Kit'],
        duration: 1.5,
        rating: 5,
        notes: 'Customer satisfied, unit running efficiently'
      }
    ]
    
    setJob(mockJob)
    setServiceHistory(mockServiceHistory)
    setCustomerNotes('Prefers communication via WhatsApp. Has two cats.')
    setFutureTechNotes('Check capacitor connections. Outdoor unit mounting may need reinforcement.')
  }

  // Use effects
  useEffect(() => {
    fetchWorkOrderData()
    
    const interval = setInterval(() => {
      if (timeTracker.running && timeTracker.startTime) {
        const elapsed = Math.floor((Date.now() - timeTracker.startTime) / 1000) + timeTracker.elapsed
        setTimeTracker(prev => ({ ...prev, elapsed }))
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [jobId])

  // Progress calculation
  useEffect(() => {
    const completed = checklist.filter(item => item.checked).length
    const total = checklist.length
    const allChecked = completed === total && total > 0
    
    const hasSignature = signature !== null && 
                        signature !== undefined && 
                        signature !== '' && 
                        signature !== 'null' && 
                        signature !== 'undefined'
    
    const canCompleteJob = allChecked && hasSignature
    
    console.log('📊 PROGRESS UPDATE:', {
      completed,
      total,
      allChecked,
      hasSignature,
      canCompleteJob,
      signatureExists: !!signature
    })
    
    setProgress({
      checklist: {
        completed,
        total,
        progress: total > 0 ? (completed / total) * 100 : 0,
        allChecked
      },
      canComplete: canCompleteJob
    })
    
  }, [checklist, signature])

  // Signature canvas init
  useEffect(() => {
    if (showSignaturePad && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = isDark ? '#ffffff' : '#000000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [showSignaturePad, isDark])

  // Utility functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Photo functions
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - photos.length)
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotos(prev => [...prev, {
          id: Date.now().toString(),
          url: e.target.result,
          name: file.name,
          timestamp: new Date().toISOString()
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (photoId) => {
    setPhotos(photos.filter(p => p.id !== photoId))
  }

  // Signature functions
  const startDrawing = (e) => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    let x, y
    if (e.touches) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
      e.preventDefault()
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    
    const canvas = signatureCanvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    let x, y
    if (e.touches) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
      e.preventDefault()
    } else {
      x = e.clientX - rect.left
      y = e.clientY - rect.top
    }
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setSignature(null)
    }
  }

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current
    if (canvas) {
      const signatureData = canvas.toDataURL()
      if (signatureData && signatureData.length > 100) {
        setSignature(signatureData)
        setShowSignaturePad(false)
      } else {
        alert('Please draw a signature first')
      }
    }
  }

  // Checklist functions
  const toggleChecklistItem = (id) => {
    const updatedChecklist = checklist.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    )
    setChecklist(updatedChecklist)
  }

  const allChecked = checklist.every(item => item.checked)

  // Notes function
  const saveFutureTechNotes = async () => {
    if (!futureTechNotes.trim()) return
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5001/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          content: futureTechNotes 
        })
      })
      
      if (response.ok) {
        alert('Notes saved successfully')
      }
    } catch (err) {
      console.error('Error saving notes:', err)
      alert('Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  // Start service function
  const handleStartService = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`http://localhost:5001/jobs/${jobId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('✅ Service started! Customer notified.')
          setTimeTracker(prev => ({ 
            ...prev, 
            running: true, 
            startTime: new Date() 
          }))
          fetchWorkOrderData()
        }
      }
    } catch (err) {
      console.error('Error starting service:', err)
      alert('Failed to start service')
    } finally {
      setSaving(false)
    }
  }

  // Confirm technician function
  const handleConfirmTechnician = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`http://localhost:5001/jobs/${jobId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('✅ On the way! Customer notified.')
          fetchWorkOrderData()
        }
      }
    } catch (err) {
      console.error('Error confirming technician:', err)
      alert('Failed to confirm')
    } finally {
      setSaving(false)
    }
  }

  // Complete job function
  const handleCompleteJob = async () => {
    if (!allChecked) {
      alert('Please complete all checklist items before finishing the job.')
      return
    }
    
    if (!signature) {
      alert('Please capture customer signature.')
      return
    }
    
    if (!confirm('Are you sure you want to complete this job? This action cannot be undone.')) {
      return
    }
    
    try {
      setSaving(true)
      const token = localStorage.getItem('token')
      
      const completionData = {
        actualCost: job?.estimatedCost || 0,
        workPerformed: 'Service completed successfully'
      }
      
      const response = await fetch(`http://localhost:5001/jobs/${jobId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completionData)
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('✅ Job completed! Customer notified.')
          navigate('/technician')
        }
      }
    } catch (err) {
      console.error('Error completing job:', err)
      alert('Failed to complete job')
    } finally {
      setSaving(false)
    }
  }

  // Navigation functions
  const handleLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login')
  }

  const getCurrentPage = () => {
    return 'work-order'
  }

  // Loading state
  if (loading && !job) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-gray-50 to-blue-50'
      }`}>
        <div className="text-center">
          <Loader2 className={`w-20 h-20 animate-spin mx-auto mb-6 ${
            isDark ? 'text-white' : 'text-blue-500'
          }`} />
          <div className="space-y-4">
            <div className={`h-4 w-48 rounded animate-pulse mx-auto ${
              isDark ? 'bg-dark-card' : 'bg-gray-200'
            }`}></div>
            <div className={`h-4 w-32 rounded animate-pulse mx-auto ${
              isDark ? 'bg-dark-card' : 'bg-gray-200'
            }`}></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !job) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-gray-50 to-blue-50'
      }`}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Failed to Load Work Order
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={fetchWorkOrderData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className={`px-6 py-2 border rounded-lg transition-colors ${
                isDark 
                  ? 'border-dark-border text-gray-300 hover:bg-dark-card' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tabs config
  const tabs = [
    { id: 'work-order', label: 'Work Order', icon: ClipboardCheck },
    { id: 'service-history', label: 'Service History', icon: History },
    { id: 'future-notes', label: 'Notes for Future', icon: Info },
    { id: 'customer-notes', label: 'Customer Notes', icon: User },
  ]

  const serviceCost = job?.estimatedCost || 0
  const totalCost = serviceCost

  // Render
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-gray-50 via-white to-blue-50'
    }`}>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header with Tabs */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${
                isDark ? 'text-white' : 'text-gray-800'
              }`}>
                {job?.title || 'Work Order'} - {job?.customer?.name || 'Customer'}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {job?.customer?.address || 'Address not available'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    job?.priority === 'High' 
                      ? isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                      : job?.priority === 'Medium'
                      ? isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                      : isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                  }`}>
                    {job?.priority || 'Normal'} Priority
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    job?.status === 'completed' 
                      ? isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                      : job?.status === 'in-progress' 
                      ? isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                      : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {job?.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Start Service Button */}
            {job?.status === 'ASSIGNED' && (
              <button
                onClick={handleStartService}
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Play size={18} />
                <span>Start Service</span>
              </button>
            )}
            
            {/* Confirm Button */}
            {job?.status === 'IN_PROGRESS' && (
              <button
                onClick={handleConfirmTechnician}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Navigation size={18} />
                <span>I'm On My Way</span>
              </button>
            )}
          </div>
          
          {/* Tabs */}
          <div className={`border-b ${isDark ? 'border-dark-border' : 'border-gray-200'}`}>
            <div className="flex overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? isDark
                          ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                          : 'border-blue-600 text-blue-600 bg-blue-50'
                        : isDark
                          ? 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-dark-card'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Work Order Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'work-order' && (
              <>
                <BookingDetailsPanel job={job} />
                
                {/* Google Maps Preview */}
                {job?.customer?.address && job.customer.address.length > 10 && (
                  <div className={`rounded-2xl border p-6 shadow-sm ${
                    isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-gray-800'
                    }`}>
                      <MapPin className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      Service Location
                    </h3>
                    
                    <div className="mb-4">
                      <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>{job.customer.address}</p>
                    </div>
                    
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className={`flex items-center gap-2 transition-colors ${
                          isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {showMap ? 'Hide Map' : 'Show Location on Map'}
                        </span>
                      </button>
                      
                      {showMap && (
                        <div className={`mt-3 rounded-lg overflow-hidden border shadow-sm ${
                          isDark ? 'border-dark-border' : 'border-gray-200'
                        }`}>
                          <iframe
                            title="Service Location"
                            width="100%"
                            height="300"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://www.google.com/maps?q=${encodeURIComponent(job.customer.address)}&output=embed`}
                            allowFullScreen
                            loading="lazy"
                          />
                          <div className={`p-3 flex justify-between items-center border-t ${
                            isDark ? 'bg-dark-bg border-dark-border' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <p className={`text-sm truncate max-w-[60%] ${
                              isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              📍 {job.customer.address}
                            </p>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.customer.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-sm font-medium flex items-center gap-1 ${
                                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              Open in Google Maps
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Product Section */}
                {job?.product && (
                  <div className={`rounded-2xl border p-6 shadow-sm ${
                    isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
                  }`}>
                    <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-gray-800'
                    }`}>
                      <Package className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      Equipment Details
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Brand/Model</p>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {job.product.brand} {job.product.model}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Category</p>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {job.product.category}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Serial Number</p>
                        <p className={`font-mono text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {job.product.serialNumber}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Purchase Date</p>
                        <p className={isDark ? 'text-white' : 'text-gray-900'}>
                          {new Date(job.product.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Warranty Status</p>
                        <p>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            job.product.warrantyStatus === 'ACTIVE' 
                              ? isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
                              : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {job.product.warrantyStatus}
                          </span>
                        </p>
                      </div>
                      {job.product.serviceCount > 0 && (
                        <div>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Previous Services</p>
                          <p className={isDark ? 'text-white' : 'text-gray-900'}>{job.product.serviceCount} services</p>
                        </div>
                      )}
                    </div>
                    
                    {job.product.lastServiceDate && (
                      <div className={`mt-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <Clock className="w-4 h-4 inline mr-1" />
                        Last serviced: {new Date(job.product.lastServiceDate).toLocaleDateString()}
                      </div>
                    )}
                    
                    {/* Document links */}
                    {(job.product.invoiceFile || job.product.warrantyCardFile) && (
                      <div className={`mt-4 pt-4 border-t flex gap-4 ${
                        isDark ? 'border-dark-border' : 'border-gray-200'
                      }`}>
                        {job.product.invoiceFile && (
                          <button 
                            onClick={() => window.open(job.product.invoiceFile, '_blank')}
                            className={`text-sm font-medium flex items-center gap-1 ${
                              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            View Invoice
                          </button>
                        )}
                        {job.product.warrantyCardFile && (
                          <button 
                            onClick={() => window.open(job.product.warrantyCardFile, '_blank')}
                            className={`text-sm font-medium flex items-center gap-1 ${
                              isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            Warranty Card
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Photo Upload */}
                <div className={`rounded-2xl border p-6 shadow-sm ${
                  isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${
                      isDark ? 'text-white' : 'text-gray-800'
                    }`}>
                      <Camera className={isDark ? 'text-blue-400' : 'text-blue-500'} size={24} />
                      Photo Upload (Max 5 photos)
                    </h3>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photos.length >= 5 || saving}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                        photos.length >= 5 || saving
                          ? isDark
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                      }`}
                    >
                      {saving ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      <span>Upload Photos</span>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={photos.length >= 5 || saving}
                    />
                  </div>
                  
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {photos.map(photo => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.name}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removePhoto(photo.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b-lg">
                            <p className="text-xs truncate">{photo.name}</p>
                          </div>
                        </div>
                      ))}
                      
                      {Array.from({ length: 5 - photos.length }).map((_, i) => (
                        <div key={i} className={`border-2 border-dashed rounded-lg h-32 flex items-center justify-center ${
                          isDark ? 'border-dark-border' : 'border-gray-300'
                        }`}>
                          <div className="text-center">
                            <CameraIcon className={`mx-auto mb-2 ${
                              isDark ? 'text-gray-600' : 'text-gray-400'
                            }`} size={24} />
                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Empty slot</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-12 border-2 border-dashed rounded-xl ${
                      isDark ? 'border-dark-border' : 'border-gray-300'
                    }`}>
                      <CameraIcon className={`mx-auto mb-4 ${
                        isDark ? 'text-gray-600' : 'text-gray-400'
                      }`} size={48} />
                      <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>No photos uploaded yet</p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Upload up to 5 photos of the job
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Service History Tab */}
            {activeTab === 'service-history' && (
              <div className={`rounded-2xl border p-6 shadow-sm ${
                isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  <History className={isDark ? 'text-blue-400' : 'text-blue-500'} size={24} />
                  Service History - Previous Visits
                </h3>
                
                {serviceHistory.length > 0 ? (
                  <div className="space-y-4">
                    {serviceHistory.map(visit => (
                      <div key={visit.id} className={`p-4 border rounded-xl transition-colors ${
                        isDark 
                          ? 'border-dark-border hover:bg-dark-bg' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                              {visit.service}
                            </h4>
                            <div className={`flex items-center gap-4 mt-1 ${
                              isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>
                              <span className="text-sm">
                                {new Date(visit.date).toLocaleDateString('en-MY', { 
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-sm">
                                Duration: {visit.duration}h
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={16} 
                                  className={i < visit.rating ? "text-amber-500 fill-amber-500" : "text-gray-300 dark:text-gray-600"} 
                                />
                              ))}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {visit.technician}
                            </span>
                          </div>
                        </div>
                        
                        <p className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{visit.description}</p>
                        
                        {visit.parts && visit.parts.length > 0 && (
                          <div className="mb-3">
                            <p className={`text-sm font-medium mb-1 ${
                              isDark ? 'text-gray-300' : 'text-gray-600'
                            }`}>Parts Used:</p>
                            <div className="flex flex-wrap gap-2">
                              {visit.parts.map((part, index) => (
                                <span key={index} className={`px-3 py-1 rounded-full text-xs ${
                                  isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {visit.notes && (
                          <div className={`p-3 rounded-lg ${
                            isDark ? 'bg-blue-900/20' : 'bg-blue-50'
                          }`}>
                            <p className={`text-sm ${
                              isDark ? 'text-gray-300' : 'text-gray-700'
                            }`}>{visit.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <History className={`mx-auto mb-4 ${
                      isDark ? 'text-gray-600' : 'text-gray-400'
                    }`} size={48} />
                    <p>No service history found</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      This customer's first service with us
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Notes for Future Tech Tab */}
            {activeTab === 'future-notes' && (
              <div className={`rounded-2xl border p-6 shadow-sm ${
                isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  <Info className={isDark ? 'text-blue-400' : 'text-blue-500'} size={24} />
                  Notes for Future Technician
                </h3>
                
                <div className="mb-6">
                  <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Add notes that will help the next technician who services this location. 
                    Include any special instructions, warnings, or useful information.
                  </p>
                  
                  <textarea
                    value={futureTechNotes}
                    onChange={(e) => setFutureTechNotes(e.target.value)}
                    className={`w-full h-64 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark 
                        ? 'bg-dark-bg border-dark-border text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    }`}
                    placeholder="Example: Circuit breaker is located in the garage behind the toolbox. Customer prefers notifications 30 minutes before arrival."
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setFutureTechNotes('')}
                    className={`px-6 py-2.5 border rounded-lg transition-colors ${
                      isDark 
                        ? 'border-dark-border text-gray-300 hover:bg-dark-card' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveFutureTechNotes}
                    disabled={saving || !futureTechNotes.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={20} className="animate-spin" /> : 'Save Notes'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Customer Notes Tab */}
            {activeTab === 'customer-notes' && (
              <div className={`rounded-2xl border p-6 shadow-sm ${
                isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  <User className={isDark ? 'text-blue-400' : 'text-blue-500'} size={24} />
                  Customer Notes & Special Instructions
                </h3>
                
                <div className="mb-6">
                  <div className={`p-4 rounded-xl border mb-6 ${
                    isDark 
                      ? 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-800' 
                      : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white">
                        <User size={24} />
                      </div>
                      <div>
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {job?.customer?.name || 'Customer'}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Primary Contact</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>Customer Notes</h4>
                    <textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className={`w-full h-48 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark 
                          ? 'bg-dark-bg border-dark-border text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                      placeholder="Add any customer preferences, notes, or special requirements..."
                    />
                  </div>
                  
                  {job?.location && (
                    <div>
                      <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>Location Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-dark-bg' : 'bg-gray-50'
                        }`}>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Property Type</p>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {job.location.type}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-dark-bg' : 'bg-gray-50'
                        }`}>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Floor</p>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {job.location.floor}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-dark-bg' : 'bg-gray-50'
                        }`}>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Access Instructions</p>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {job.location.access}
                          </p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          isDark ? 'bg-dark-bg' : 'bg-gray-50'
                        }`}>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pets</p>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {job.location.pets}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Completion Section */}
          <div className="space-y-6">
            {/* LIVE TRACKING SECTION */}
            <TechnicianLiveTracker 
              jobId={jobId}
              customerAddress={job?.customer?.address}
              onTrackingActive={setTrackingActive}
            />

            {/* Digital Signature */}
            <div className={`rounded-2xl border p-6 shadow-sm ${
              isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-gray-800'
              }`}>
                <FileSignature className={isDark ? 'text-blue-400' : 'text-blue-500'} size={24} />
                Digital Signature
              </h3>
              
              {signature ? (
                <div className="text-center">
                  <div className={`mb-4 border rounded-lg p-4 ${
                    isDark ? 'border-dark-border' : 'border-gray-300'
                  }`}>
                    <img src={signature} alt="Customer Signature" className="h-24 mx-auto" />
                  </div>
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Signature captured
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSignaturePad(true)}
                      className={`flex-1 py-2.5 border rounded-lg transition-colors ${
                        isDark 
                          ? 'border-dark-border text-gray-300 hover:bg-dark-card' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Resign
                    </button>
                    <button
                      onClick={clearSignature}
                      className={`flex-1 py-2.5 rounded-lg transition-colors ${
                        isDark 
                          ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : showSignaturePad ? (
                <div>
                  <div className="mb-4">
                    <canvas
                      ref={signatureCanvasRef}
                      width={300}
                      height={150}
                      className={`w-full h-40 border rounded-lg cursor-crosshair ${
                        isDark ? 'border-dark-border bg-dark-bg' : 'border-gray-300 bg-white'
                      }`}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      onTouchCancel={stopDrawing}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearSignature}
                      className={`flex-1 py-2.5 border rounded-lg transition-colors ${
                        isDark 
                          ? 'border-dark-border text-gray-300 hover:bg-dark-card' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Clear
                    </button>
                    <button
                      onClick={saveSignature}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={20} className="animate-spin" /> : 'Save Signature'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    isDark ? 'bg-dark-bg' : 'bg-gray-100'
                  }`}>
                    <FileSignature className={isDark ? 'text-gray-500' : 'text-gray-400'} size={32} />
                  </div>
                  <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    No signature captured yet
                  </p>
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
                  >
                    Capture Signature
                  </button>
                </div>
              )}
            </div>
            
            {/* Completion Checklist */}
            <div className={`rounded-2xl border p-6 shadow-sm ${
              isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-gray-800'
              }`}>
                <ClipboardCheck className={isDark ? 'text-blue-400' : 'text-blue-500'} size={24} />
                Completion Checklist
              </h3>
              
              <div className="space-y-3">
                {checklist.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors cursor-pointer ${
                      isDark 
                        ? 'border-dark-border hover:bg-dark-bg' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleChecklistItem(item.id)}
                  >
                    {item.checked ? (
                      <CheckSquare className="text-emerald-600 dark:text-emerald-400" size={20} />
                    ) : (
                      <Square className={isDark ? 'text-gray-500' : 'text-gray-400'} size={20} />
                    )}
                    <span className={`flex-1 ${item.checked 
                      ? isDark ? 'text-gray-500 line-through' : 'text-gray-500 line-through'
                      : isDark ? 'text-white' : 'text-gray-800'
                    }`}>
                      {item.task}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className={`mt-6 p-4 rounded-xl border ${
                isDark 
                  ? 'bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-800' 
                  : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Completion Progress
                  </span>
                  <span className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {progress.checklist.completed}/{progress.checklist.total}
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${
                  isDark ? 'bg-blue-900/30' : 'bg-blue-100'
                }`}>
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${progress.checklist.progress}%` }}
                  ></div>
                </div>
                {progress.checklist.allChecked && (
                  <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Check size={16} />
                    <span className="text-sm font-medium">All checklist items completed</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Job Summary */}
            <div className={`bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 text-white`}>
              <h3 className="text-xl font-bold mb-6">Job Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Time Spent</span>
                  <span className="text-xl font-bold">{formatTime(timeTracker.elapsed)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Photos Taken</span>
                  <span className="text-xl font-bold">{photos.length}/5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-200">Service Price</span>
                  <span className="text-xl font-bold">RM {serviceCost.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-blue-700">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">Estimated Total</span>
                  <span className="text-2xl font-bold">RM {totalCost.toFixed(2)}</span>
                </div>
                
                <button
                  onClick={handleCompleteJob}
                  disabled={!progress.canComplete || saving}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    progress.canComplete && !saving
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 cursor-pointer'
                      : 'bg-gray-600 cursor-not-allowed opacity-70'
                  }`}
                >
                  {saving ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : progress.canComplete ? (
                    'Complete Job'
                  ) : (
                    'Complete All Steps'
                  )}
                </button>
                
                {!progress.canComplete && (
                  <p className="text-center text-blue-300 text-sm mt-3">
                    {!progress.checklist.allChecked && '✓ Complete all checklist items • '}
                    {!signature && '✎ Capture customer signature'}
                  </p>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className={`rounded-2xl border p-6 shadow-sm ${
              isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${
                  isDark 
                    ? 'border-dark-border hover:bg-dark-bg' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <MessageSquare className={`mb-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} size={20} />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Message</span>
                </button>
                <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${
                  isDark 
                    ? 'border-dark-border hover:bg-dark-bg' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <Phone className={`mb-2 ${isDark ? 'text-green-400' : 'text-green-600'}`} size={20} />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Call</span>
                </button>
                <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${
                  isDark 
                    ? 'border-dark-border hover:bg-dark-bg' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <Navigation className={`mb-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} size={20} />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Navigate</span>
                </button>
                <button className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-colors ${
                  isDark 
                    ? 'border-dark-border hover:bg-dark-bg' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <Download className={`mb-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} size={20} />
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className={`mt-8 flex justify-between items-center`}>
          <button
            onClick={() => navigate('/technician/myschedule')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-dark-card' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft size={18} />
            <span>Back to Schedule</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchWorkOrderData}
              className={`px-4 py-2.5 border rounded-lg transition-colors ${
                isDark 
                  ? 'border-dark-border text-gray-300 hover:bg-dark-card' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Refresh'}
            </button>
            <button className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all">
              Save Draft
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}