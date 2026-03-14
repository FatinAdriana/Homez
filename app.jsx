
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'


import Loading from './components/Loading'


import Home from './user/home'
import Layout from './components/layout'
import ServiceDetail from './user/servicedetail'
import ServiceHistory from './user/servicehistory'
import ServiceProviders from './user/serviceproviders'
import WarrantyCheck from './user/warrantycheck'
import ProductRegistration from './user/productregistration'
import Profile from './user/profile'
import BookService from './user/bookservice'
import Login from './user/login'
import BookingForm from './user/bookingform'
import PaymentPage from './user/paymentpage'
import PaymentSuccess from './user/paymentsuccesspage'
import CompanyDetails from './user/companydetails'
import ProductDetail from './user/productdetail'
import VoiceTest from './user/voicetest'
import BookingSuccess from './user/bookingsuccess'

import GuestHome from './guest/guest'
import Register from './guest/register'
import Services from './guest/services'
import HowItWorks from './guest/howitworks'
import About from './guest/about'
import Contact from './guest/contact'


import CareersPage from './components/careerspage'
import ApplyTechnician from './components/applytechnician'
import ApplyCompany from './components/applycompany'
import AcceptInvitation from './components/acceptinvitation'
import ViewAllInvitations from './components/viewallinvitations'
import ResetPassword from './components/ResetPassword'
import AuthSuccess from './components/AuthSuccess'


import CompanyHome from './company/companyhome'
import CompanyLayout from './components/companylayout'
import Technicians from './company/technicians/technicians'
import TechniciansList from './company/technicians/technicianslist'
import TechnicianProfile from './company/technicians/technicianprofile'
import AddTechnician from './company/technicians/addtechnicians'
import FindTechnicians from './company/technicians/findtechnicians'
import TechnicianProfilePage from './company/technicians/technicianprofile'
import Customers from './company/customers/customers'
import CustomersList from './company/customers/customerslist'
import CustomerProfile from './company/customers/customerprofile'
import CustomerCommunication from './company/customers/customercommunication'
import CustomerDetail from './company/customers/customerdetail'
import Schedules from './company/schedules/schedules'
import CalendarView from './company/schedules/calendarview'
import ScheduleBoard from './company/schedules/scheduleboard'
import AvailabilityManagement from './company/schedules/availabilitymanagement'
import Finances from './company/finances/finances'
import ExpenseTracking from './company/finances/expensetracking'
import Invoices from './company/finances/invoices'
import PaymentTracking from './company/finances/paymenttracking'
import RevenueReports from './company/finances/revenuereports'
import InvoiceDetail from './company/finances/invoicedetail'
import Jobs from './company/jobs/jobs'
import JobAssignment from './company/jobs/jobassignment'
import JobsList from './company/jobs/jobslist'
import JobDetails from './company/jobs/jobdetails'
import CreateJobModal from './company/jobs/createjobmodal'
import Settings from './company/settings/settings'
import CompanyProfile from './company/settings/companyprofile'
import NotificationSettings from './company/settings/notificationsettings'
import ServiceTypes from './company/settings/servicetypes'
import TeamSettings from './company/settings/teamsettings'
import BillingSettings from './company/settings/billingsettings'
import InvoicesPage from './company/settings/invoicespage'
import CompanyCoupons from './company/companycoupons'
import CommunicationPage from './company/communication/CommunicationPage'


import TechnicianHome from './technician/technicianhome'
import MySchedule from './technician/myschedule'
import JobWorkOrder from './technician/jobworkorder'
import TechnicianLayout from './components/technicianlayout'
import PartsInventory from './technician/partsinventory'
import TechnicianSettings from './technician/techniciansettings'
import TechnicianNotFound from './technician/techniciannotfound'
import JobSelection from './technician/jobselection'


import AdminHome from './admin/adminhome'
import CompanyManagement from './admin/companymanagement'
import AdminLayout from './components/adminlayout'
import UserManagement from './admin/usermanagement'
import BillingManagement from './admin/billingmanagement'
import Analytics from './admin/analytics'
import SystemReportsAnalytics from './admin/systemreportsanalytics'
import JobManagement from './admin/jobmanagement'
import AdminCoupons from './admin/admincoupons'
import AdminSettings from './admin/adminsettings'
import AdminSupport from './admin/adminsupport'


const hasSeenLoader = () => {
  try { return sessionStorage.getItem('homez_loaded') === 'true'; }
  catch { return false; }
};

const markLoaderSeen = () => {
  try { sessionStorage.setItem('homez_loaded', 'true'); }
  catch {}
};

export default function App() {

  const [appReady, setAppReady] = useState(hasSeenLoader);

  const handleLoaderComplete = () => {
    markLoaderSeen();
    setAppReady(true);
  };

  return (
    <ThemeProvider>
 
      {!appReady && <Loading onComplete={handleLoaderComplete} />}

 
      <BrowserRouter>
        <Routes>
      
          <Route path="/"               element={<Login />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/guest"          element={<GuestHome />} />
          <Route path="/services"       element={<Services />} />
          <Route path="/services/:category" element={<ServiceDetail />} />
          <Route path="/howitworks"     element={<HowItWorks />} />
          <Route path="/about"          element={<About />} />
          <Route path="/contact"        element={<Contact />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/success"   element={<AuthSuccess />} />

  
          <Route path="/careers"         element={<CareersPage />} />
          <Route path="/careerspage"     element={<CareersPage />} />
          <Route path="/applytechnician" element={<ApplyTechnician />} />
          <Route path="/applycompany"    element={<ApplyCompany />} />
          <Route path="/accept-invitation/:invitationId?" element={<AcceptInvitation />} />
          <Route path="/my-invitations"  element={<ViewAllInvitations />} />

  
          <Route element={<Layout />}>
            <Route path="/home"                              element={<Home />} />
            <Route path="/service-history"                   element={<ServiceHistory />} />
            <Route path="/service-detail/:serviceId"         element={<ServiceDetail />} />
            <Route path="/service-providers"                 element={<ServiceProviders />} />
            <Route path="/service-providers/:serviceType"    element={<ServiceProviders />} />
            <Route path="/warranty-check"                    element={<WarrantyCheck />} />
            <Route path="/product-registration"              element={<ProductRegistration />} />
            <Route path="/profile"                           element={<Profile />} />
            <Route path="/voicetest"                         element={<VoiceTest />} />
            <Route path="/book-service"                      element={<BookService />} />
            <Route path="/booking/:companyId"                element={<BookingForm />} />
            <Route path="/company/:companyId"                element={<CompanyDetails />} />
            <Route path="/product/:productId"                element={<ProductDetail />} />
            <Route path="/payment/:bookingId"                element={<PaymentPage />} />
            <Route path="/booking/success/:bookingId"        element={<PaymentSuccess />} />
            <Route path="/booking/success/:bookingId"        element={<BookingSuccess />} />
          </Route>


<Route element={<CompanyLayout />}>
  <Route path="/company/companyhome" element={<CompanyHome />} />
  <Route path="/company/technicians" element={<Technicians />} />
  <Route path="/company/technicianslist" element={<TechniciansList />} />
  <Route path="/company/technicianprofile" element={<TechnicianProfile />} />
  <Route path="/company/technicians/:id" element={<TechnicianProfilePage />} />
  <Route path="/company/findtechnician" element={<FindTechnicians />} />
  <Route path="/company/addtechnicians" element={<AddTechnician />} />
  <Route path="/company/customers" element={<Customers />} />
  <Route path="/company/customerslist" element={<CustomersList />} />
  <Route path="/company/customerprofile" element={<CustomerProfile />} />
  <Route path="/company/customercommunication" element={<CustomerCommunication />} />
  <Route path="/company/customers/:customerId" element={<CustomerDetail />} />
  <Route path="/company/schedules" element={<Schedules />} />
  <Route path="/company/calendarview" element={<CalendarView />} />
  <Route path="/company/scheduleboard" element={<ScheduleBoard />} />
  <Route path="/company/availabilitymanagement" element={<AvailabilityManagement />} />
  <Route path="/company/finances" element={<Finances />} />
  <Route path="/company/expensetracking" element={<ExpenseTracking />} />
  <Route path="/company/invoices" element={<Invoices />} />
  <Route path="/company/paymenttracking" element={<PaymentTracking />} />
  <Route path="/company/revenuereports" element={<RevenueReports />} />
  <Route path="/company/finance/invoicedetail" element={<InvoiceDetail />} />
  <Route path="/company/finance/invoices/:id" element={<InvoiceDetail />} />
  <Route path="/company/jobs" element={<Jobs />} />
  <Route path="/company/jobassignment" element={<JobAssignment />} />
  <Route path="/company/jobslist" element={<JobsList />} />
  

  <Route path="/company/jobdetails/:id" element={<JobDetails />} />
  
  <Route path="/company/createjobmodal" element={<CreateJobModal />} />
  <Route path="/company/settings" element={<Settings />} />
  <Route path="/company/companyprofile" element={<CompanyProfile />} />
  <Route path="/company/notificationsettings" element={<NotificationSettings />} />
  <Route path="/company/servicetypes" element={<ServiceTypes />} />
  <Route path="/company/teamsettings" element={<TeamSettings />} />
  <Route path="/company/billingsettings" element={<BillingSettings />} />
  <Route path="/company/settings/invoicespage" element={<InvoicesPage />} />
  <Route path="/company/companycoupons" element={<CompanyCoupons />} />
  <Route path="/company/communication" element={<CommunicationPage />} />
  <Route path="/companies/:companyId" element={<CompanyDetails />} />
</Route>
      
          <Route element={<TechnicianLayout />}>
            <Route path="/technician"                             element={<Navigate to="/technician/technicianhome" />} />
            <Route path="/technician/technicianhome"              element={<TechnicianHome />} />
            <Route path="/technician/jobworkorder"                element={<JobSelection />} />
            <Route path="/technician/jobworkorder/:jobId"         element={<JobWorkOrder />} />
            <Route path="/technician/myschedule"                  element={<MySchedule />} />
            <Route path="/technician/partsinventory"              element={<PartsInventory />} />
            <Route path="/technician/techniciansettings"          element={<TechnicianSettings />} />
            <Route path="/technician/access-denied"               element={<TechnicianNotFound />} />
          </Route>

  
          <Route element={<AdminLayout />}>
            <Route path="/admin/adminhome"                        element={<AdminHome />} />
            <Route path="/admin/companymanagement"                element={<CompanyManagement />} />
            <Route path="/admin/usermanagement"                   element={<UserManagement />} />
            <Route path="/admin/jobmanagement"                    element={<JobManagement />} />
            <Route path="/admin/billingmanagement"                element={<BillingManagement />} />
            <Route path="/admin/analytics"                        element={<Analytics />} />
            <Route path="/admin/systemreportsanalytics"           element={<SystemReportsAnalytics />} />
            <Route path="/admin/admincoupons"                     element={<AdminCoupons />} />
            <Route path="/admin/adminsettings"                    element={<AdminSettings />} />
            <Route path="/admin/adminsupport"                     element={<AdminSupport />} />
          </Route>

          <Route path="*" element={<NavigateBasedOnRole />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}


function NavigateBasedOnRole() {
  const userRole     = localStorage.getItem('userRole');
  const currentPath  = window.location.pathname;

  if (!userRole) return <Navigate to="/login" />;

  if (currentPath.includes('/technician/')) {
    return userRole === 'TECHNICIAN'
      ? <Navigate to="/technician/technicianhome" />
      : <Navigate to="/technician/access-denied" />;
  }

  switch (userRole) {
    case 'COMPANY_ADMIN': return <Navigate to="/company/companyhome" />;
    case 'ADMIN':
    case 'SUPER_ADMIN':   return <Navigate to="/admin/adminhome" />;
    case 'TECHNICIAN':    return <Navigate to="/technician/technicianhome" />;
    default:              return <Navigate to="/home" />;
  }
}