// components/VoiceAssistant.jsx
//
// FULL BOOKING FLOW:
// 1. User says "book aircond" → navigates to service providers page
// 2. Voice asks "which company?" → user says name/number → confirm
// 3. Navigate to booking form → guided step-by-step fill
//
// ⚙️  CONFIGURE YOUR ROUTES HERE:
const ROUTES = {
  providers: '/service-providers',   // your service providers listing page
  booking: '/booking',               // booking page — company id appended: /booking/:id
}

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, X, ChevronDown, Sparkles, CheckCircle, SkipForward } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'

// ── Form steps ────────────────────────────────────────────────────────────────
const FORM_STEPS = [
  {
    key: 'customerName', label: 'Full Name',
    question: 'What is your full name?',
    hint: 'Just say your name. Example: Ahmad bin Ali',
    extract: (text) => {
      const c = text.replace(/^(?:my name is|name is|i am|i'm|call me)\s+/i, '').trim()
      return /^[a-zA-Z][a-zA-Z\s]{1,48}$/.test(c) && c.length >= 2 ? c : null
    },
  },
  {
    key: 'customerPhone', label: 'Phone Number',
    question: 'What is your phone number?',
    hint: 'Say each digit. Example: 0 1 2 3 4 5 6 7 8 9',
    extract: (text) => {
      const d = text.replace(/[^0-9]/g, '')
      return d.length >= 10 && d.length <= 11 ? d : null
    },
  },
  {
    key: 'customerEmail', label: 'Email', optional: true,
    question: "What is your email address? Say skip if you don't have one.",
    hint: 'Say your email or say skip',
    extract: (text) => {
      if (/^skip$/i.test(text.trim())) return '__SKIP__'
      const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
      return m ? m[0] : null
    },
  },
  {
    key: 'customerAddress', label: 'Address',
    question: 'What is your full service address?',
    hint: 'Full address with street, area and city',
    extract: (text) => {
      const c = text.replace(/^(?:my address is|address is|i live at|the address is)\s*/i, '').trim()
      return c.length >= 5 ? c : null
    },
  },
  {
    key: 'propertyType', label: 'Property Type',
    question: 'What type of property? Say: apartment, terrace, semi D, bungalow, or commercial.',
    hint: 'Say the property type',
    extract: (text) => {
      if (/apartment|condo|flat/i.test(text)) return 'apartment'
      if (/terrace/i.test(text)) return 'terrace'
      if (/semi.?d|semi detached/i.test(text)) return 'semi-d'
      if (/bungalow/i.test(text)) return 'bungalow'
      if (/commercial|office|shop/i.test(text)) return 'commercial'
      return null
    },
  },
  {
    key: 'serviceType', label: 'Service',
    question: 'What service do you need? Example: aircond, plumbing, electrical.',
    hint: 'Say the service',
    extract: (text, services) => {
      if (services?.length) {
        const f = services.find(s => text.toLowerCase().includes(s.name.toLowerCase()))
        if (f) return f.name
      }
      if (/air.?cond|aircon|\bac\b/i.test(text)) return 'aircond'
      if (/plumb/i.test(text)) return 'plumbing'
      if (/electric/i.test(text)) return 'electrical'
      if (/washing|washer/i.test(text)) return 'washing machine'
      if (/water heater/i.test(text)) return 'water heater'
      if (/cctv/i.test(text)) return 'cctv'
      return null
    },
  },
  {
    key: 'issueDescription', label: 'Issue',
    question: 'Please describe the problem. What exactly is wrong?',
    hint: 'Describe the issue in your own words',
    extract: (text) => text.trim().length >= 3 ? text.trim() : null,
  },
  {
    key: 'preferredDate', label: 'Date',
    question: 'When do you want the service? Say today, tomorrow, or a day like Monday.',
    hint: 'Say today, tomorrow, or a day name',
    extract: (text) => {
      if (/tomorrow/i.test(text)) { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] }
      if (/today/i.test(text)) return new Date().toISOString().split('T')[0]
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
      const idx = days.findIndex(d => text.toLowerCase().includes(d))
      if (idx !== -1) {
        const t = new Date(); let diff = idx - t.getDay(); if (diff<=0) diff+=7
        t.setDate(t.getDate()+diff); return t.toISOString().split('T')[0]
      }
      return null
    },
  },
  {
    key: 'preferredTime', label: 'Time',
    question: 'What time? Between 9 AM and 6 PM.',
    hint: 'Example: 10 AM or 2 PM',
    extract: (text) => {
      // Normalise: remove dots from a.m./p.m., strip leading "at"
      const clean = text
        .replace(/\bat\b\s*/i, '')           // "at 2 PM" → "2 PM"
        .replace(/a\.m\.?/gi, 'am')          // "a.m." / "a.m" → "am"
        .replace(/p\.m\.?/gi, 'pm')          // "p.m." / "p.m" → "pm"
        .replace(/o'?clock/gi, '')           // "10 o'clock" → "10"
        .trim()
      const m = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
      if (m) {
        let h = parseInt(m[1]); const min = m[2] || '00'
        if (m[3].toLowerCase() === 'pm' && h < 12) h += 12
        if (m[3].toLowerCase() === 'am' && h === 12) h = 0
        if (h >= 9 && h <= 18) return `${String(h).padStart(2,'0')}:${min}`
      }
      return null
    },
  },
  {
    key: 'urgencyLevel', label: 'Urgency',
    question: 'How urgent? Say: low, normal, high, or emergency.',
    hint: 'Emergency adds RM100, High adds RM50',
    extract: (text) => {
      if (/emergency|urgent|asap|same day/i.test(text)) return 'URGENT'
      if (/high|soon|quickly/i.test(text)) return 'HIGH'
      if (/low|not urgent|no rush/i.test(text)) return 'LOW'
      if (/normal|medium|ok|fine/i.test(text)) return 'MEDIUM'
      return null
    },
  },
]

const detectService = (text) => {
  if (/air.?cond|aircon|\bac\b/i.test(text)) return 'aircond'
  if (/plumb/i.test(text)) return 'plumbing'
  if (/electric/i.test(text)) return 'electrical'
  if (/washing|washer/i.test(text)) return 'washing machine'
  if (/water heater/i.test(text)) return 'water heater'
  if (/cctv/i.test(text)) return 'cctv'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceAssistant({ userData }) {
  const navigate = useNavigate()
  const location = useLocation()

  const path = location.pathname
  const isBookingPage   = path.startsWith(ROUTES.booking)
  const isProvidersPage = path.startsWith(ROUTES.providers)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isOpen,       setIsOpen]       = useState(false)
  const [isVisible,    setIsVisible]    = useState(false)
  const [messages,     setMessages]     = useState([])
  const [services,     setServices]     = useState([])
  const [providers,    setProviders]    = useState([])
  const [isListening,  setIsListening]  = useState(false)
  const [liveText,     setLiveText]     = useState('')
  const [uiPhase,      setUiPhase]      = useState('idle')
  const [uiStep,       setUiStep]       = useState(0)
  const [uiFilledCount,setUiFilledCount]= useState(0)

  // ── Logic refs (never stale inside speech callbacks) ──────────────────────
  const phaseRef     = useRef('idle')   // idle|chat|picking_company|confirm_company|asking|waiting_answer|confirming|waiting_confirm|done|navigating
  const stepRef      = useRef(0)
  const pendingRef   = useRef(null)     // confirmed value or company object
  const filledRef    = useRef({})
  const wantedSvcRef = useRef(null)     // service user asked to book
  const servicesRef  = useRef([])
  const providersRef = useRef([])
  const recognitionRef = useRef(null)
  const busyRef      = useRef(false)
  const messagesRef  = useRef(null)

  // ── Sync refs ─────────────────────────────────────────────────────────────
  const setPhase = (p) => { phaseRef.current = p; setUiPhase(p) }
  const setStep  = (s) => { stepRef.current  = s; setUiStep(s)  }
  useEffect(() => { servicesRef.current  = services  }, [services])
  useEffect(() => { providersRef.current = providers }, [providers])
  useEffect(() => { messagesRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (isOpen) setTimeout(() => setIsVisible(true), 10)
    else        { setIsVisible(false); hardStop() }
  }, [isOpen])

  // When page changes after navigation, continue the flow
  useEffect(() => {
    if (!isOpen) return
    if (isProvidersPage && phaseRef.current === 'navigating') {
      setTimeout(() => askWhichCompany(), 1200)
    }
    if (isBookingPage && phaseRef.current === 'navigating') {
      setTimeout(() => startFormGuide(), 1200)
    }
  }, [location.pathname]) // eslint-disable-line

  const loadData = async () => {
    try {
      const [s, p] = await Promise.all([
        axios.get('http://localhost:5001/public/services').catch(()=>({data:{success:false}})),
        axios.get('http://localhost:5001/public/companies').catch(()=>({data:{success:false}})),
      ])
      if (s.data.success) setServices(s.data.services)
      if (p.data.success) setProviders(p.data.companies)
    } catch(e) {}
  }

  // ── Speech (native Web Speech API — most reliable) ────────────────────────
  const listen = () => {
    if (busyRef.current) return
    recognitionRef.current?.abort()
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { addMsg('Please use Chrome for voice features.'); return }
    const r = new SR()
    r.lang = 'en-MY'; r.continuous = false; r.interimResults = true
    r.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setLiveText(final || interim)
      if (final) {
        r.stop(); setIsListening(false); setLiveText('')
        onHeard(final.trim())
      }
    }
    r.onerror = (e) => {
      setIsListening(false); setLiveText(''); busyRef.current = false
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        addMsg("I didn't hear that. Tap Speak to try again.")
    }
    r.onend = () => setIsListening(false)
    recognitionRef.current = r
    setLiveText(''); setIsListening(true)
    try { r.start() } catch(e) { setIsListening(false) }
  }

  const speak = (text, onEnd) => {
    window.speechSynthesis.cancel()
    busyRef.current = true
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 0.85; u.lang = 'en-MY'
      u.onend  = () => { busyRef.current = false; if (onEnd) setTimeout(onEnd, 300) }
      u.onerror= () => { busyRef.current = false; if (onEnd) setTimeout(onEnd, 300) }
      window.speechSynthesis.speak(u)
    }, 100)
  }

  const addMsg = (text, from = 'assistant') =>
    setMessages(prev => [...prev, { text, from, time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }])

  const hardStop = () => {
    recognitionRef.current?.abort()
    window.speechSynthesis.cancel()
    setIsListening(false); setLiveText('')
    setPhase('idle'); setStep(0)
    pendingRef.current = null; filledRef.current = {}
    wantedSvcRef.current = null; busyRef.current = false
    setUiFilledCount(0); setMessages([])
  }

  // ── ROUTER: every spoken word goes through here ───────────────────────────
  const onHeard = (text) => {
    console.log(`🎤 [${phaseRef.current}] step=${stepRef.current} → "${text}"`)
    const ph = phaseRef.current
    if (ph === 'chat')             { chatMessage(text);          return }
    if (ph === 'picking_company')  { handleCompanyPick(text);    return }
    if (ph === 'confirm_company')  { handleCompanyConfirm(text); return }
    if (ph === 'waiting_answer')   { handleAnswer(text);         return }
    if (ph === 'waiting_confirm')  { handleConfirm(text);        return }
    busyRef.current = false; listen()
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 1 — CHAT (general Q&A + book intent)
  // ════════════════════════════════════════════════════════════════════════════
  const startChat = () => {
    setMessages([]); filledRef.current = {}; busyRef.current = false
    wantedSvcRef.current = null; setUiFilledCount(0)
    setPhase('chat')
    const intro = 'Hello! I am your home service assistant. Say "book aircond" to start booking, or ask me anything!'
    addMsg(intro); speak(intro, () => listen())
  }

  const chatMessage = async (text) => {
    addMsg(text, 'user')
    const lower = text.toLowerCase()

    // Math
    const mathM = text.match(/(\d[\d\s]*[\+\-\*\/x][\d\s]*\d)/i)
    if (mathM) {
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${mathM[1].replace(/x/gi,'*').replace(/\s/g,'')}`)()
        const reply = `${mathM[1].trim()} equals ${result}.`
        addMsg(reply); speak(reply, () => listen()); return
      } catch(e) {}
    }

    // Services list
    if (/what service|services available|what do you (have|offer)|list service/i.test(lower)) {
      const list = servicesRef.current.length
        ? servicesRef.current.map(s=>s.name).join(', ')
        : 'aircond, plumbing, electrical, washing machine, water heater'
      const reply = `We offer: ${list}. Which one do you need?`
      addMsg(reply); speak(reply, () => listen()); return
    }

    // Pricing
    if (/how much|price|cost|fee|charge|\brm\b/i.test(lower)) {
      const list = servicesRef.current.length
        ? servicesRef.current.map(s=>`${s.name} from RM ${s.basePrice}`).join(', ')
        : 'services from RM 80'
      const reply = `Pricing: ${list}. High priority adds RM 50, emergency adds RM 100.`
      addMsg(reply); speak(reply, () => listen()); return
    }

    // Companies
    if (/company|companies|provider|which company|how many/i.test(lower)) {
      const list = providersRef.current.length
        ? providersRef.current.map(p=>p.name).join(', ')
        : 'several verified providers'
      const reply = `We have ${providersRef.current.length} companies: ${list}.`
      addMsg(reply); speak(reply, () => listen()); return
    }

    // Hours
    if (/hour|open|close|timing|when are/i.test(lower)) {
      const reply = 'Technicians are available 9 AM to 8 PM every day including weekends.'
      addMsg(reply); speak(reply, () => listen()); return
    }

    // ── BOOK INTENT ── the main flow trigger
    const svc = detectService(lower)
    if (/book|want to|i need|i want|fix my|repair|service my/i.test(lower) || svc) {
      handleBookIntent(svc); return
    }

    // AI fallback
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post('http://localhost:5001/api/ai/assistant', {
        text,
        context: { companies: providersRef.current.map(p=>({id:p.id,name:p.name})), services: servicesRef.current.map(s=>s.name) }
      }, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 })
      const reply = res.data?.message || 'I can help with home services. What do you need?'
      addMsg(reply); speak(reply, () => listen())
    } catch(e) {
      const reply = 'I can help with aircond, plumbing, electrical and more. Say what service you need!'
      addMsg(reply); speak(reply, () => listen())
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 2 — BOOK INTENT → providers page
  // ════════════════════════════════════════════════════════════════════════════
  const handleBookIntent = (svc) => {
    if (!svc) {
      // Don't know which service yet — ask
      const list = servicesRef.current.length
        ? servicesRef.current.map(s=>s.name).join(', ')
        : 'aircond, plumbing, electrical, washing machine'
      const reply = `Sure! Which service do you need? We have: ${list}.`
      addMsg(reply); speak(reply, () => listen()); return
    }

    wantedSvcRef.current = svc
    const reply = `Sure! Let me show you the ${svc} service providers. Please wait.`
    addMsg(reply)
    setPhase('navigating')
    speak(reply, () => {
      navigate(`${ROUTES.providers}?service=${encodeURIComponent(svc)}`)
      // askWhichCompany() will be called by the location.pathname useEffect
    })
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 3 — PROVIDERS PAGE → pick company
  // ════════════════════════════════════════════════════════════════════════════
  const askWhichCompany = () => {
    setPhase('picking_company')
    const svc = wantedSvcRef.current

    // If no providers loaded, reload
    if (providersRef.current.length === 0) {
      loadData().then(() => {
        const list = providersRef.current.map((p,i)=>`${i+1}: ${p.name}`).join(', ')
        const q = `Which company would you like for ${svc || 'this service'}? ${list ? `We have: ${list}.` : ''} Say the name or number.`
        addMsg(q); speak(q, () => listen())
      })
      return
    }

    const list = providersRef.current.map((p,i)=>`number ${i+1}: ${p.name}`).join(', ')
    const q = `Great! Which company would you like for your ${svc || 'service'}? We have ${list}. Say the company name or number.`
    addMsg(q); speak(q, () => listen())
  }

  const handleCompanyPick = (text) => {
    addMsg(text, 'user')
    const lower = text.toLowerCase()
    const ps = providersRef.current

    // By number
    const numM = text.match(/\b([0-9]+)\b/)
    if (numM) {
      const idx = parseInt(numM[1]) - 1
      if (idx >= 0 && idx < ps.length) { confirmCompany(ps[idx]); return }
    }

    // By name (partial match)
    const matched = ps.find(p =>
      lower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().split(/\s+/).some(word => word.length > 2 && lower.includes(word))
    )
    if (matched) { confirmCompany(matched); return }

    // No match
    const list = ps.map((p,i)=>`${i+1}: ${p.name}`).join(', ')
    const retry = `Sorry, I did not catch that. Please say the company name or number. Options: ${list}.`
    addMsg(retry); speak(retry, () => listen())
  }

  const confirmCompany = (company) => {
    pendingRef.current = company
    setPhase('confirm_company')
    const msg = `You chose ${company.name}. Is that correct? Say yes to confirm or no to choose again.`
    addMsg(msg); speak(msg, () => listen())
  }

  const handleCompanyConfirm = (text) => {
    addMsg(text, 'user')
    const yes = /^(yes|yeah|yep|correct|right|ok|okay|sure|confirm)/i.test(text.trim())
    const no  = /^(no|nope|wrong|different|change|other)/i.test(text.trim())

    if (yes) {
      const company = pendingRef.current
      const svc     = wantedSvcRef.current
      const msg     = `Perfect! Taking you to book ${svc || 'the service'} with ${company.name}. I will guide you through the form!`
      addMsg(msg)
      setPhase('navigating')
      speak(msg, () => {
        navigate(`${ROUTES.booking}/${company.id}`, {
          state: {
            serviceType:   svc,
            customerName:  userData?.name  || '',
            customerEmail: userData?.email || '',
            customerPhone: userData?.phone || '',
          }
        })
        // startFormGuide() called by location.pathname useEffect
      })
    } else if (no) {
      askWhichCompany()
    } else {
      const unclear = `Please say yes to confirm ${pendingRef.current?.name}, or no to choose again.`
      addMsg(unclear); speak(unclear, () => listen())
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 4 — BOOKING FORM → guided fill
  // ════════════════════════════════════════════════════════════════════════════
  const startFormGuide = () => {
    filledRef.current = {}; setUiFilledCount(0)
    setStep(0); pendingRef.current = null; busyRef.current = false
    const intro = 'Great! I will now guide you through the form. I will ask each question one by one. Let us begin!'
    addMsg(intro)
    speak(intro, () => askFormStep(0))
  }

  const askFormStep = (idx) => {
    if (idx >= FORM_STEPS.length) { finishForm(); return }
    const s = FORM_STEPS[idx]
    setStep(idx); setPhase('asking')
    addMsg(s.question)
    speak(s.question, () => { setPhase('waiting_answer'); listen() })
  }

  const handleAnswer = (text) => {
    addMsg(text, 'user')
    const step = FORM_STEPS[stepRef.current]
    const val  = step.extract(text, servicesRef.current)

    if (val === '__SKIP__' && step.optional) {
      addMsg('Okay, skipping.')
      speak('Okay, skipping.', () => askFormStep(stepRef.current + 1))
      return
    }

    if (val) {
      pendingRef.current = val
      const confirm = buildConfirm(step, val)
      setPhase('confirming'); addMsg(confirm)
      speak(confirm, () => { setPhase('waiting_confirm'); listen() })
    } else {
      const retry = `Sorry, I did not catch that. ${step.hint}. Please try again.`
      addMsg(retry); speak(retry, () => { setPhase('waiting_answer'); listen() })
    }
  }

  const buildConfirm = (step, val) => {
    if (step.key === 'customerName')   return `I got the name ${val}. Correct? Say yes or no.`
    if (step.key === 'customerPhone')  return `Phone number ${val.split('').join(' ')}. Correct? Say yes or no.`
    if (step.key === 'preferredDate')  return `Date is ${new Date(val).toDateString()}. Correct? Say yes or no.`
    if (step.key === 'urgencyLevel') {
      const l = { LOW:'low priority', MEDIUM:'normal priority', HIGH:'high priority, extra RM 50', URGENT:'emergency same day, extra RM 100' }
      return `${l[val]}. Correct? Say yes or no.`
    }
    return `I got: ${val}. Correct? Say yes or no.`
  }

  const handleConfirm = (text) => {
    addMsg(text, 'user')
    const yes = /^(yes|yeah|yep|correct|right|ok|okay|sure|confirm|that.?s right)/i.test(text.trim())
    const no  = /^(no|nope|wrong|incorrect|not right|change|redo|again)/i.test(text.trim())

    if (yes) {
      const step = FORM_STEPS[stepRef.current]
      const val  = pendingRef.current
      filledRef.current[step.key] = val
      const count = Object.keys(filledRef.current).length
      setUiFilledCount(count)
      console.log(`✅ ${step.key} = "${val}"  (${count} saved)`)
      window.dispatchEvent(new CustomEvent('voice-fill-form', { detail: { [step.key]: val } }))
      const msg = step.key === 'customerName' ? `Nice to meet you, ${val}!` : `Saved!`
      addMsg(msg)
      speak(msg, () => {
        const next = stepRef.current + 1
        setStep(next)
        next >= FORM_STEPS.length ? finishForm() : askFormStep(next)
      })
    } else if (no) {
      const retry = `Let me ask again. ${FORM_STEPS[stepRef.current].question}`
      addMsg(retry)
      speak(retry, () => { setPhase('waiting_answer'); listen() })
    } else {
      addMsg('Say yes if correct, or no to try again.')
      speak('Say yes if correct, or no to try again.', () => { setPhase('waiting_confirm'); listen() })
    }
  }

  const finishForm = () => {
    setPhase('done')
    const count = Object.keys(filledRef.current).length
    const msg = `Excellent! I have filled ${count} fields for you. Please review the form and press Book Now when you are ready.`
    addMsg(msg); speak(msg)
  }

  // ── Skip ──────────────────────────────────────────────────────────────────
  const skipStep = () => {
    recognitionRef.current?.abort(); window.speechSynthesis.cancel(); busyRef.current = false
    addMsg(`Skipped: ${FORM_STEPS[stepRef.current]?.label}`, 'system')
    const next = stepRef.current + 1
    setStep(next)
    next >= FORM_STEPS.length ? finishForm() : askFormStep(next)
  }

  // ── FAB / open → decide what to do ───────────────────────────────────────
  const onOpen = () => {
    if (isOpen) { setIsOpen(false); return }
    setIsOpen(true)
  }

  // ── When opened, auto-start correct mode ─────────────────────────────────
  useEffect(() => {
    if (!isOpen || !isVisible) return
    if (uiPhase !== 'idle') return // already running
    if (isBookingPage)   { startFormGuide(); return }
    if (isProvidersPage) { askWhichCompany(); return }
    startChat()
  }, [isVisible]) // eslint-disable-line

  // ── Tap mic to re-speak or re-listen ─────────────────────────────────────
  const pressMic = () => {
    if (['idle','done'].includes(uiPhase)) { startChat(); return }
    window.speechSynthesis.cancel(); busyRef.current = false
    if (['waiting_answer','asking'].includes(uiPhase)) {
      const q = FORM_STEPS[stepRef.current]?.question
      q ? speak(q, () => { setPhase('waiting_answer'); listen() }) : listen()
    } else if (['waiting_confirm','confirm_company'].includes(uiPhase)) {
      speak('Say yes to confirm or no to try again.', () => listen())
    } else if (uiPhase === 'picking_company') {
      askWhichCompany()
    } else {
      listen()
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  const supported  = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const progress   = Math.round((uiFilledCount / FORM_STEPS.length) * 100)
  const currentStep = FORM_STEPS[uiStep]

  const phaseLabel = () => {
    if (uiPhase === 'idle')                                    return 'Tap mic to start'
    if (uiPhase === 'chat')                                    return isListening ? '🎤 Listening...' : '💬 Ask anything'
    if (uiPhase === 'navigating')                              return '🔄 Please wait...'
    if (uiPhase === 'picking_company')                         return isListening ? '🎤 Say company name...' : 'Choose a company'
    if (uiPhase === 'confirm_company')                         return isListening ? '🎤 Say yes or no...' : 'Confirm company?'
    if (['asking','waiting_answer'].includes(uiPhase))        return isListening ? '🎤 Speak your answer...' : `Q${uiStep+1} of ${FORM_STEPS.length}`
    if (['confirming','waiting_confirm'].includes(uiPhase))   return isListening ? '🎤 Say yes or no...' : 'Confirm answer?'
    if (uiPhase === 'done')                                    return `✅ ${uiFilledCount} fields filled!`
    return '...'
  }

  const micLabel = () => {
    if (isListening)                                           return 'Listening...'
    if (['idle','done'].includes(uiPhase))                     return 'Start'
    if (['waiting_confirm','confirm_company'].includes(uiPhase)) return 'Say Yes / No'
    if (uiPhase === 'picking_company')                         return 'Say Company Name'
    return 'Speak'
  }

  if (!supported) return (
    <button className="fixed bottom-4 right-24 z-50 w-14 h-14 rounded-full bg-gray-400 shadow-lg flex items-center justify-center"
      onClick={() => alert('Please use Chrome or Edge for voice.')}>
      <MicOff className="w-6 h-6 text-white" />
    </button>
  )

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setIsOpen(false)} />}

      {/* Panel */}
      <div className={`fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm transition-all duration-300 ${
        isOpen && isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: 520 }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isListening ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Voice Assistant</p>
                  <p className="text-slate-300 text-xs">{phaseLabel()}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar — booking page only */}
            {isBookingPage && !['idle','chat','navigating','done'].includes(uiPhase) && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{uiFilledCount} of {FORM_STEPS.length} fields</span>
                  <span>{progress}%</span>
                </div>
                <div className="bg-white/10 rounded-full h-1.5">
                  <div className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500" style={{ width:`${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 text-sm text-gray-700 w-full whitespace-pre-line">
                  {isBookingPage
                    ? `👋 Hi! I'll guide you through the booking form.\n\nI'll ask each question — just speak your answer!`
                    : isProvidersPage
                    ? `👋 I'll help you pick a company!\n\nI'll read out the options — just say the name.`
                    : `👋 Hi! I can:\n\n• Book a service — say "book aircond"\n• Answer questions about services & prices\n• Guide you through the full booking process\n\nStarting now...`}
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg animate-pulse">
                    <Mic size={28} className="text-white" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Initialising...</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from==='user'?'justify-end':msg.from==='system'?'justify-center':'justify-start'}`}>
                {msg.from === 'system'
                  ? <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.text}</span>
                  : <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      msg.from==='user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.from==='user'?'text-indigo-200':'text-gray-300'}`}>{msg.time}</p>
                    </div>}
              </div>
            ))}

            {/* Done summary */}
            {uiPhase === 'done' && Object.keys(filledRef.current).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Form Filled
                </h4>
                {Object.entries(filledRef.current).map(([k,v]) => {
                  const s = FORM_STEPS.find(s=>s.key===k)
                  return <p key={k} className="text-xs text-green-700"><span className="font-medium">{s?.label}:</span> {v}</p>
                })}
                <button onClick={startFormGuide} className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">↺ Fill Again</button>
              </div>
            )}

            <div ref={messagesRef} />
          </div>

          {/* Controls */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
            {isListening && (
              <div className="flex items-center gap-2 mb-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                <p className="text-xs text-red-600 flex-1 truncate">
                  {liveText ? `"${liveText}"` : 'Speak now...'}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={pressMic} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                isListening ? 'bg-red-500 text-white' :
                ['idle','done'].includes(uiPhase) ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}>
                <Mic size={18} /> {micLabel()}
              </button>

              {isBookingPage && !['idle','done','chat','navigating'].includes(uiPhase) && (
                <button onClick={skipStep} title="Skip this question"
                  className="p-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
                  <SkipForward size={18} />
                </button>
              )}

              {uiPhase !== 'idle' && (
                <button onClick={hardStop} title="Stop"
                  className="p-3 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500">
                  <X size={18} />
                </button>
              )}
            </div>
            {isBookingPage && !['idle','done','chat','navigating'].includes(uiPhase) && currentStep && (
              <p className="text-center text-[10px] text-gray-400 mt-2">💡 {currentStep.hint}</p>
            )}
          </div>

        </div>
      </div>

      {/* FAB */}
      <button onClick={onOpen} className={`fixed bottom-4 right-24 md:right-28 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
        isOpen ? 'bg-gray-700' : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:scale-110'
      }`}>
        {!isOpen && <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-25" />}
        {isOpen ? <X className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
      </button>
    </>
  )
}