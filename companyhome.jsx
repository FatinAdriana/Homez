// company/CompanyHome.jsx - WITH DARK MODE
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import axios from 'axios'
import {
  Users, Briefcase, DollarSign, TrendingUp,
  ChevronRight, BarChart3, Bell, Plus, Search,
  Star, Shield, Zap, Target, Award, PieChart,
  Activity, CreditCard, RefreshCw, Calendar, Clock,
  Building, UserCheck, Settings, LogOut
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts'

const API_URL = 'http://localhost:5001/companydashboard'

export default function CompanyHome() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [companyData, setCompanyData] = useState(null)
  const [companyProfile, setCompanyProfile] = useState(null)
  const [timeGreeting, setTimeGreeting] = useState('')
  const [timeRange, setTimeRange] = useState('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // raw API data
  const [statsData, setStatsData]           = useState(null)
  const [revenueTrend, setRevenueTrend]     = useState([])
  const [serviceDistrib, setServiceDistrib] = useState([])
  const [recentJobs, setRecentJobs]         = useState([])
  const [topTechs, setTopTechs]             = useState([])
  const [schedule, setSchedule]             = useState([])

  const getHeaders = () => {
    let token = localStorage.getItem('token') || ''
    try { if (token.startsWith('"')) token = JSON.parse(token) } catch { token = token.replace(/^"|"$/g, '').trim() }
    return { Authorization: `Bearer ${token}` }
  }

  const fetchCompanyProfile = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      console.log('🔍 Fetching company profile...')
      
      const storedUser = localStorage.getItem('userData')
      let companyId = null
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          companyId = userData.id || userData.companyId
        } catch (e) {}
      }
      
      if (!companyId && companyData?.id) {
        companyId = companyData.id
      }
      
      if (!companyId) {
        console.warn('⚠️ No companyId found, skipping profile fetch')
        return
      }
      
      const response = await axios.get(`http://localhost:5001/companyprofile/profile/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('📦 Profile response:', response.data)
      
      if (response.data.success) {
        setCompanyProfile(response.data.company.profile)
        console.log('✅ Company profile loaded:', response.data.company.profile)
      }
    } catch (error) {
      console.error('❌ Error fetching company profile:', error)
    }
  }

  useEffect(() => {
    const h = new Date().getHours()
    setTimeGreeting(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')
    
    fetchCompanyProfile()
    
    const stored = localStorage.getItem('userData')
    if (stored) { 
      try { 
        const parsed = JSON.parse(stored)
        if (!companyProfile) setCompanyData(parsed)
      } catch {} 
    }
  }, [])

  useEffect(() => { fetchAll() }, [timeRange])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    const headers = getHeaders()

    try {
      const [statsRes, revenueRes, jobsRes, techsRes, schedRes] = await Promise.allSettled([
        axios.get(`${API_URL}/dashboard/stats?period=${timeRange}`, { headers }),
        axios.get(`${API_URL}/dashboard/revenue-trend?period=${timeRange}`, { headers }),
        axios.get(`${API_URL}/dashboard/jobs/recent?limit=5`, { headers }),
        axios.get(`${API_URL}/dashboard/technicians/top?limit=3`, { headers }),
        axios.get(`${API_URL}/schedule/today`, { headers }),
      ])

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data
        if (d.success && d.data) {
          console.log('✅ Stats data:', d.data)
          setStatsData(d.data)
        } else console.warn('stats no data:', d)
      }

      if (revenueRes.status === 'fulfilled') {
        const d = revenueRes.value.data
        if (d.success && d.data) {
          setRevenueTrend(d.data.revenueTrend || [])
          setServiceDistrib(d.data.serviceDistribution || [])
        }
      }

      if (jobsRes.status === 'fulfilled') {
        const d = jobsRes.value.data
        if (d.success) setRecentJobs(d.jobs || [])
      }

      if (techsRes.status === 'fulfilled') {
        const d = techsRes.value.data
        if (d.success) setTopTechs(d.technicians || [])
      }

      if (schedRes.status === 'fulfilled') {
        const d = schedRes.value.data
        if (d.success) setSchedule(d.schedule || [])
      }

    } catch (err) {
      console.error('fetchAll error:', err)
      setError('Failed to load dashboard. Please try again.')
      if (err.response?.status === 401) { localStorage.clear(); navigate('/login') }
    } finally {
      setLoading(false)
    }
  }

  // ─── Derived values ────────────────────────────────────────────────────────
  const mainStats     = statsData?.mainStats    || {}
  const quickStats    = statsData?.quickStats   || []

  const totalRevenue     = mainStats.totalRevenue    || 0
  const activeJobs       = mainStats.activeJobs      || 0
  const totalTechnicians = mainStats.totalTechnicians || 0
  const satisfactionRate = mainStats.satisfactionRate || 0

  // tech performance for bar chart
  const techPerformance = topTechs.map(t => ({
    name: (t.name || 'Tech').split(' ')[0],
    jobs: t.jobsCompleted || 0,
    rating: t.rating || 0
  }))

  const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899']

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDark ? 'bg-dark-bg' : 'bg-gray-50'
    }`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse mx-auto mb-4"></div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading dashboard…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDark ? 'bg-dark-bg' : 'bg-gray-50'
    }`}>
      <div className={`text-center p-8 rounded-2xl shadow-lg max-w-md ${
        isDark ? 'bg-dark-card border border-dark-border' : 'bg-white'
      }`}>
        <p className="text-red-500 text-4xl mb-4">⚠️</p>
        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Error Loading Dashboard</h2>
        <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
        <button onClick={fetchAll} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    </div>
  )

  const displayName = companyProfile?.name || companyData?.name || 'Admin'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-dark-bg' : 'bg-gradient-to-br from-gray-50 via-white to-blue-50'
    }`}>
      {/* Stat Cards with Dark Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { 
            title: 'Total Revenue',  
            value: `RM ${totalRevenue.toLocaleString()}`, 
            sub: 'this period',  
            icon: DollarSign, 
            color: 'from-blue-500 to-cyan-500'
          },
          { 
            title: 'Active Jobs',    
            value: activeJobs,                             
            sub: 'in progress',  
            icon: Briefcase,  
            color: 'from-emerald-500 to-green-500'
          },
          { 
            title: 'Technicians',    
            value: totalTechnicians,                       
            sub: 'registered',   
            icon: Users,      
            color: 'from-violet-500 to-purple-500'
          },
          { 
            title: 'Satisfaction',   
            value: `${satisfactionRate}%`,                 
            sub: 'avg rating',   
            icon: TrendingUp, 
            color: 'from-amber-500 to-orange-500'
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              className={`
                rounded-2xl p-6 border transition-all duration-300 
                hover:shadow-xl hover:-translate-y-1 group
                ${isDark 
                  ? 'bg-dark-card border-dark-border hover:border-blue-500/30' 
                  : 'bg-white border-gray-200'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold mb-1 ${
                    isDark ? 'text-white' : 'text-gray-800'
                  }`}>
                    {stat.value}
                  </p>
                  <p className={`text-sm ${
                    isDark ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    {stat.sub}
                  </p>
                </div>
                <div className={`
                  p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform
                  bg-gradient-to-r ${stat.color}
                `}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
              
              {/* Optional mini progress bar for satisfaction */}
              {i === 3 && satisfactionRate > 0 && (
                <div className="mt-4">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isDark ? 'bg-gray-800' : 'bg-gray-200'
                  }`}>
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                      style={{ width: `${satisfactionRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className={`lg:col-span-2 rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${
          isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
        }`}>
          <div className="mb-5">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
              <BarChart3 className={isDark ? 'text-blue-400' : 'text-blue-500'} size={22} /> 
              Revenue Trend
            </h2>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Daily revenue and job count
            </p>
          </div>
          
          {revenueTrend.length > 0 && revenueTrend.some(d => d.revenue > 0 || d.jobs > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDark ? '#333' : '#e5e7eb'} 
                  />
                  <XAxis 
                    dataKey="day" 
                    stroke={isDark ? '#666' : '#6b7280'} 
                    fontSize={11} 
                    tick={{ fill: isDark ? '#999' : '#6b7280' }}
                  />
                  <YAxis 
                    yAxisId="l" 
                    stroke={isDark ? '#666' : '#6b7280'} 
                    fontSize={11}
                    tick={{ fill: isDark ? '#999' : '#6b7280' }}
                  />
                  <YAxis 
                    yAxisId="r" 
                    orientation="right" 
                    stroke={isDark ? '#666' : '#6b7280'} 
                    fontSize={11}
                    tick={{ fill: isDark ? '#999' : '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(v, name) => name === 'revenue' 
                      ? [`RM ${v.toLocaleString()}`, 'Revenue'] 
                      : [v, 'Jobs']
                    }
                    contentStyle={{ 
                      fontSize: 12, 
                      borderRadius: 8,
                      backgroundColor: isDark ? '#1a1a1a' : 'white',
                      borderColor: isDark ? '#333' : '#e5e7eb',
                      color: isDark ? '#fff' : '#000'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: isDark ? '#fff' : '#000' }} />
                  <Bar yAxisId="l" dataKey="revenue" name="Revenue (RM)" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar yAxisId="r" dataKey="jobs"    name="Jobs"         fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-64 flex items-center justify-center ${
              isDark ? 'text-gray-600' : 'text-gray-400'
            }`}>
              <div className="text-center">
                <BarChart3 size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No revenue data yet</p>
                <p className="text-xs mt-1">Will populate as jobs are completed</p>
              </div>
            </div>
          )}
        </div>

        {/* Service Distribution Pie Chart */}
        <div className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${
          isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 mb-5 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            <PieChart className={isDark ? 'text-violet-400' : 'text-violet-500'} size={22} /> 
            Service Types
          </h2>
          {serviceDistrib.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie 
                      data={serviceDistrib} 
                      cx="50%" 
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={70} 
                      dataKey="value"
                    >
                      {serviceDistrib.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={v => [`${v} jobs`, 'Count']}
                      contentStyle={{ 
                        backgroundColor: isDark ? '#1a1a1a' : 'white',
                        borderColor: isDark ? '#333' : '#e5e7eb',
                        color: isDark ? '#fff' : '#000'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {serviceDistrib.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }}
                      />
                      <span className={`text-xs truncate max-w-28 ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>{item.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={`h-44 flex items-center justify-center ${
              isDark ? 'text-gray-600' : 'text-gray-400'
            }`}>
              <div className="text-center">
                <PieChart size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No service data yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technician Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${
          isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 mb-5 ${
            isDark ? 'text-white' : 'text-gray-800'
          }`}>
            <Users className={isDark ? 'text-amber-400' : 'text-amber-500'} size={22} /> 
            Technician Performance
          </h2>
          {techPerformance.length > 0 && techPerformance.some(t => t.jobs > 0) ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={techPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
                  <XAxis 
                    type="number" 
                    stroke={isDark ? '#666' : '#6b7280'} 
                    fontSize={11}
                    tick={{ fill: isDark ? '#999' : '#6b7280' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke={isDark ? '#666' : '#6b7280'} 
                    fontSize={11} 
                    width={65}
                    tick={{ fill: isDark ? '#999' : '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(v, name) => name === 'rating' ? [`${v}/5`, 'Rating'] : [`${v}`, 'Jobs']}
                    contentStyle={{ 
                      fontSize: 12, 
                      borderRadius: 8,
                      backgroundColor: isDark ? '#1a1a1a' : 'white',
                      borderColor: isDark ? '#333' : '#e5e7eb',
                      color: isDark ? '#fff' : '#000'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: isDark ? '#fff' : '#000' }} />
                  <Bar dataKey="jobs"   name="Jobs"   fill="#3b82f6" radius={[0,4,4,0]} />
                  <Bar dataKey="rating" name="Rating" fill="#8b5cf6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-56 flex items-center justify-center ${
              isDark ? 'text-gray-600' : 'text-gray-400'
            }`}>
              <div className="text-center">
                <Users size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No technician activity yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Today's Schedule */}
        <div className={`rounded-2xl border p-6 shadow-sm transition-colors duration-300 ${
          isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-gray-800'
            }`}>
              <Calendar className={isDark ? 'text-blue-400' : 'text-blue-500'} size={22} /> 
              Today's Schedule
            </h2>
            <button onClick={() => navigate('/company/calendarview')}
              className="text-blue-600 text-sm font-medium hover:text-blue-800">View all</button>
          </div>
          {schedule.length > 0 ? (
            <div className="space-y-3 max-h-56 overflow-y-auto">
              {schedule.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                  item.color 
                    ? item.color 
                    : isDark 
                      ? 'bg-blue-900/30 text-blue-400' 
                      : 'bg-blue-50 text-blue-700'
                }`}>
                  <p className="text-sm font-bold min-w-14">{item.time}</p>
                  <div>
                    <p className="font-semibold text-sm">{item.customer}</p>
                    <p className={`text-xs opacity-80 ${
                      isDark ? 'text-blue-400/80' : 'text-blue-700/80'
                    }`}>{item.service} · {item.technician}</p>
                    <p className={`text-xs opacity-70 ${
                      isDark ? 'text-blue-400/70' : 'text-blue-700/70'
                    }`}>{item.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`h-56 flex items-center justify-center ${
              isDark ? 'text-gray-600' : 'text-gray-400'
            }`}>
              <div className="text-center">
                <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No appointments today</p>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Footer */}
      <div className="pt-5 border-t border-gray-200 dark:border-dark-border text-center">
        <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          © {new Date().getFullYear()} {displayName} · Last updated {new Date().toLocaleDateString('en-MY')}
        </p>
      </div>
    </div>
  )
}