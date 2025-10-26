import React, { useState, useEffect, useRef } from 'react';
import {
  FiSend, FiUser, FiGlobe, FiX, FiCopy, FiCheck,
  FiMessageSquare, FiSearch, FiStar, FiShare2, FiRotateCcw,
  FiAlertTriangle, FiPlus, FiChevronRight, FiChevronLeft, FiMic, FiSpeaker, FiUpload, FiFile, FiClock, FiThumbsUp, FiRotateCw,
  FiMenu, FiHeart, FiAlertCircle, FiBook, FiBookmark, FiAward, FiMap, FiHome, FiBriefcase, FiUsers, FiCompass, FiMapPin, FiDownload,
  FiBookOpen, FiCalendar, FiBarChart2, FiLayers, FiTarget, FiTool
} from 'react-icons/fi';
import { 
  MdEmergency,
  MdLocationOn,
  MdSchool,
  MdWork,
  MdExplore,
  MdBusinessCenter,
  MdLibraryBooks,
  MdRefresh,
  MdPerson,
  MdGroup,
  MdBuild,
  MdLocalLibrary
} from 'react-icons/md';
import './App.css';
import Logo from './images/logo.png';

// UDOM API endpoints
const UDOM_API = {
  base: 'https://www.udom.ac.tz',
  ratiba: 'https://ratiba.udom.ac.tz/api',
  news: 'https://www.udom.ac.tz/api/news',
  courses: 'https://www.udom.ac.tz/api/courses'
};

function App() {
  // Core state
  const [activeTab, setActiveTab] = useState('home');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('English');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('library');
  const [userLocation, setUserLocation] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [academicData, setAcademicData] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  // CIVE Buildings Data from Google Maps coordinates
  const civeBuildings = {
    library: {
      name: "CIVE Library",
      location: { lat: -6.2172955, lng: 35.8095612 },
      address: "College of Informatics and Virtual Education, UDOM",
      type: "Academic",
      description: "Main library with study spaces, computers, and research materials",
      facilities: ["Study Areas", "Computers", "Research Materials", "Quiet Zones"],
      hours: "8:00 AM - 10:00 PM",
      contact: "library@cive.udom.ac.tz"
    },
    academicBlock: {
      name: "Academic Block A",
      location: { lat: -6.2171955, lng: 35.8097612 },
      address: "Main Academic Building, CIVE",
      type: "Academic", 
      description: "Primary lecture halls and classrooms for informatics programs",
      facilities: ["Lecture Halls", "Classrooms", "Faculty Offices", "Student Lounge"],
      hours: "7:00 AM - 10:00 PM",
      contact: "academic@cive.udom.ac.tz"
    },
    adminBlock: {
      name: "Administration Block",
      location: { lat: -6.2173955, lng: 35.8093612 },
      address: "CIVE Administration Building",
      type: "Administrative",
      description: "Administrative offices and student services",
      facilities: ["Dean's Office", "Student Affairs", "Registration", "Finance", "HR"],
      hours: "8:00 AM - 5:00 PM",
      contact: "admin@cive.udom.ac.tz"
    },
    lrb: {
      name: "Learning Resource Building (LRB)",
      location: { lat: -6.2170955, lng: 35.8099612 },
      address: "CIVE Learning Resources Center",
      type: "Academic",
      description: "Digital learning resources and computer labs",
      facilities: ["Computer Labs", "Digital Library", "E-Learning Studio", "Group Study Rooms"],
      hours: "7:00 AM - 9:00 PM", 
      contact: "lrb@cive.udom.ac.tz"
    },
    labs: {
      name: "Computer Labs Complex",
      location: { lat: -6.2174955, lng: 35.8091612 },
      address: "CIVE Laboratories Building",
      type: "Academic",
      description: "Specialized computer laboratories and research facilities",
      facilities: ["Programming Labs", "Networking Lab", "Research Lab", "Project Rooms", "Server Room"],
      hours: "7:00 AM - 10:00 PM",
      contact: "labs@cive.udom.ac.tz"
    },
    cafeteria: {
      name: "CIVE Cafeteria", 
      location: { lat: -6.2169955, lng: 35.8091612 },
      address: "Student Cafeteria and Social Area",
      type: "Amenity",
      description: "Food court and student social gathering space",
      facilities: ["Food Counters", "Dining Area", "Outdoor Seating", "Snack Bar", "WiFi Zone"],
      hours: "6:30 AM - 8:00 PM",
      contact: "cafeteria@cive.udom.ac.tz"
    },
    auditorium: {
      name: "Main Auditorium",
      location: { lat: -6.2175955, lng: 35.8098612 },
      address: "CIVE Conference and Events Center",
      type: "Academic",
      description: "Large auditorium for conferences, seminars and events",
      facilities: ["500+ Capacity", "Audio-Visual Equipment", "Stage", "Conference Rooms"],
      hours: "As Scheduled",
      contact: "events@cive.udom.ac.tz"
    },
    workshop: {
      name: "Technical Workshop",
      location: { lat: -6.2176955, lng: 35.8090612 },
      address: "CIVE Technical and Practical Labs",
      type: "Academic",
      description: "Hands-on technical training and workshop area",
      facilities: ["Hardware Lab", "Repair Station", "Prototyping Area", "Tools"],
      hours: "8:00 AM - 6:00 PM",
      contact: "workshop@cive.udom.ac.tz"
    },
    researchCenter: {
      name: "Research Center",
      location: { lat: -6.2177955, lng: 35.8097612 },
      address: "CIVE Research and Innovation Hub",
      type: "Research",
      description: "Advanced research facilities and innovation labs",
      facilities: ["Research Labs", "Innovation Hub", "Meeting Rooms", "Presentation Area"],
      hours: "8:00 AM - 8:00 PM",
      contact: "research@cive.udom.ac.tz"
    },
    studentCenter: {
      name: "Student Center",
      location: { lat: -6.2168955, lng: 35.8096612 },
      address: "CIVE Student Activities Building",
      type: "Student Services",
      description: "Student organizations, clubs, and activities center",
      facilities: ["Club Offices", "Meeting Rooms", "Recreation Area", "Student Council"],
      hours: "8:00 AM - 9:00 PM",
      contact: "students@cive.udom.ac.tz"
    }
  };

  // Navigation tabs
  const tabs = [
    { id: 'home', icon: FiHome, label: { en: 'Home', sw: 'Nyumbani' } },
    { id: 'map', icon: FiMap, label: { en: 'Campus Map', sw: 'Ramani ya Kampasi' } },
    { id: 'academics', icon: MdLocalLibrary, label: { en: 'Academics', sw: 'Masomo' } },
    { id: 'chat', icon: FiMessageSquare, label: { en: 'CiveGPT', sw: 'CiveGPT' } }
  ];

  // Quick actions for home tab
  const quickActions = [
    {
      icon: MdEmergency,
      title: { en: 'Emergency', sw: 'Dharura' },
      description: { en: 'Campus security & emergency contacts', sw: 'Usalama wa kampasi na mawasiliano ya dharura' },
      color: 'text-red-500',
      action: () => window.open('tel:0755123456')
    },
    {
      icon: MdExplore,
      title: { en: 'Campus Tour', sw: 'Ziara ya Kampasi' },
      description: { en: 'Virtual campus navigation', sw: 'Uelekezo wa kampasi mtandaoni' },
      color: 'text-orange-500',
      action: () => setActiveTab('map')
    },
    {
      icon: MdLocalLibrary,
      title: { en: 'Academic Resources', sw: 'Rasilimali za Masomo' },
      description: { en: 'Library, courses & materials', sw: 'Maktaba, kozi na nyenzo' },
      color: 'text-green-500',
      action: () => setActiveTab('academics')
    },
    {
      icon: FiUsers,
      title: { en: 'Student Services', sw: 'Huduma za Wanafunzi' },
      description: { en: 'Support services and guidance', sw: 'Huduma za usaidizi na mwongozo' },
      color: 'text-purple-500',
      action: () => setActiveTab('chat')
    }
  ];

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation && activeTab === 'map') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, [activeTab]);

  // Load academic data
  useEffect(() => {
    if (activeTab === 'academics' && !academicData) {
      fetchAcademicData();
    }
  }, [activeTab, academicData]);

  // Initialize map
  useEffect(() => {
    if (activeTab === 'map' && !mapLoaded) {
      initializeMap();
    }
  }, [activeTab, mapLoaded]);

  // Auto-scroll to bottom of chat - FIXED: Only scrolls chat area
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  // Fetch academic data from UDOM APIs
  const fetchAcademicData = async () => {
    try {
      // Simulate API calls - replace with actual UDOM API endpoints
      const response = await fetch('/api/academic-data');
      const data = await response.json();
      setAcademicData(data);
    } catch (error) {
      console.log('Failed to fetch academic data, using fallback');
      setAcademicData(getFallbackAcademicData());
    }
  };

  // Fallback academic data
  const getFallbackAcademicData = () => ({
    resources: [
      {
        title: "Library Resources",
        description: "Access online journals, books and research materials",
        link: "https://library.udom.ac.tz",
        icon: FiBookOpen
      },
      {
        title: "Course Timetables", 
        description: "View and download your course schedules",
        link: "https://ratiba.udom.ac.tz",
        icon: FiCalendar
      },
      {
        title: "Exam Results",
        description: "Check your examination results and transcripts",
        link: "https://results.udom.ac.tz",
        icon: FiBarChart2
      },
      {
        title: "Academic Calendar",
        description: "Important dates and academic events",
        link: "https://www.udom.ac.tz/academic-calendar",
        icon: FiCalendar
      },
      {
        title: "Online Learning",
        description: "Access e-learning platforms and resources",
        link: "https://elearning.udom.ac.tz",
        icon: FiLayers
      },
      {
        title: "Research Portal",
        description: "University research publications and projects",
        link: "https://research.udom.ac.tz",
        icon: FiTarget
      }
    ],
    importantDates: [
      { event: "University Opening", date: "November 8-11, 2025" }
    ]
  });

  // Initialize Google Maps
  const initializeMap = () => {
    setTimeout(() => {
      setMapLoaded(true);
    }, 1000);
  };

  // Chat with backend API
  const handleQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    const userMsg = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setQuery('');

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          language: language,
          history: chatHistory.slice(-5)
        })
      });

      const data = await response.json();
      
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot', 
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions || []
      };
      
      setChatHistory(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat API error:', error);
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot', 
        content: language === 'English' 
          ? "I'm having trouble connecting right now. Please try again shortly or check your internet connection."
          : "Nina shida ya kuunganisha sasa. Tafadhali jaribu tena baadaye au angalia muunganisho wako wa intaneti.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatHistory(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  const downloadTimetable = () => {
    window.open('https://ratiba.udom.ac.tz/downloads/index', '_blank');
  };

  // Render Interactive Map
  const renderMap = () => (
    <div className="map-container bg-dark-surface rounded-2xl p-6">
      <div className="map-header flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          {civeBuildings[selectedBuilding].name}
        </h2>
        <select 
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="bg-dark-hover border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
        >
          {Object.entries(civeBuildings).map(([key, building]) => (
            <option key={key} value={key}>{building.name}</option>
          ))}
        </select>
      </div>

      <div className="map-wrapper bg-dark-hover rounded-xl h-96 relative overflow-hidden border border-gray-700">
        {mapLoaded ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FiMapPin className="text-4xl text-orange-500 mx-auto mb-3" />
              <p className="text-white font-semibold mb-2">{civeBuildings[selectedBuilding].name}</p>
              <p className="text-gray-400 text-sm">
                Latitude: {civeBuildings[selectedBuilding].location.lat}
                <br />
                Longitude: {civeBuildings[selectedBuilding].location.lng}
              </p>
              <button 
                onClick={() => window.open(`https://maps.google.com/?q=${civeBuildings[selectedBuilding].location.lat},${civeBuildings[selectedBuilding].location.lng}`)}
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {language === 'English' ? 'Open in Google Maps' : 'Fungua kwenye Ramani za Google'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-3"></div>
              <p className="text-gray-400">{language === 'English' ? 'Loading campus map...' : 'Inapakia ramani ya kampasi...'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="map-info grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="building-details">
          <h3 className="font-semibold text-white mb-2">
            {language === 'English' ? 'Building Information' : 'Taarifa za Jengo'}
          </h3>
          <p className="text-gray-400 text-sm mb-1">{civeBuildings[selectedBuilding].address}</p>
          <p className="text-gray-300 text-sm mb-2">{civeBuildings[selectedBuilding].description}</p>
          
          <div className="building-meta grid grid-cols-2 gap-2 mb-3">
            <div>
              <span className="text-gray-400 text-xs">{language === 'English' ? 'Type:' : 'Aina:'}</span>
              <p className="text-white text-sm">{civeBuildings[selectedBuilding].type}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs">{language === 'English' ? 'Hours:' : 'Masaa:'}</span>
              <p className="text-white text-sm">{civeBuildings[selectedBuilding].hours}</p>
            </div>
          </div>
          
          <div className="facilities mt-2">
            <h4 className="text-white text-sm font-medium mb-1">
              {language === 'English' ? 'Facilities:' : 'Vifaa:'}
            </h4>
            <div className="flex flex-wrap gap-1">
              {civeBuildings[selectedBuilding].facilities.map((facility, index) => (
                <span key={index} className="bg-orange-500/20 text-orange-400 text-xs px-2 py-1 rounded">
                  {facility}
                </span>
              ))}
            </div>
          </div>
        </div>

        {userLocation && (
          <div className="user-location bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <h4 className="text-green-400 text-sm font-medium mb-1">
              {language === 'English' ? 'Your Location' : 'Eneo Lako'}
            </h4>
            <p className="text-gray-400 text-xs">
              Lat: {userLocation.lat.toFixed(6)}
              <br />
              Lng: {userLocation.lng.toFixed(6)}
            </p>
            <button 
              onClick={() => setUserLocation(null)}
              className="text-green-400 hover:text-green-300 text-xs mt-2"
            >
              {language === 'English' ? 'Refresh Location' : 'Sasisha Eneo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render Academics Tab
  const renderAcademics = () => (
    <div className="tab-content">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">
          {language === 'English' ? 'Academic Resources' : 'Rasilimali za Masomo'}
        </h1>
        <button 
          onClick={downloadTimetable}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          <FiDownload className="text-lg" />
          <span>{language === 'English' ? 'Download Timetable' : 'Pakua Ratiba'}</span>
        </button>
      </div>

      {academicData ? (
        <>
          <div className="resources-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {academicData.resources.map((resource, index) => (
              <a
                key={index}
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-card bg-dark-surface rounded-2xl p-5 hover:bg-dark-hover transition-all duration-200 border border-gray-700 hover:border-orange-500/30"
              >
                <div className="flex items-center space-x-3">
                  <resource.icon className="text-2xl text-orange-500" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">{resource.title}</h3>
                    <p className="text-gray-400 text-sm">{resource.description}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="academic-calendar bg-dark-surface rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">
              {language === 'English' ? 'Important Dates' : 'Tarehe Muhimu'}
            </h2>
            <div className="space-y-3">
              {academicData.importantDates.map((date, index) => (
                <div key={index} className="date-item flex justify-between items-center p-3 bg-dark-hover rounded-xl hover:bg-gray-700 transition-all duration-200">
                  <span className="text-white text-sm">{date.event}</span>
                  <span className="text-orange-400 text-sm font-medium">{date.date}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-3"></div>
          <p className="text-gray-400">{language === 'English' ? 'Loading academic data...' : 'Inapakia taarifa za masomo...'}</p>
        </div>
      )}
    </div>
  );

  // Render Chat Tab with Twitter-like Design - FIXED SCROLLING
  const renderChat = () => (
    <div className="tab-content h-full flex flex-col">
      <div className="chat-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">CiveGPT</h1>
          <p className="text-gray-400 text-sm">
            {language === 'English' ? 'Your UDOM AI Assistant' : 'Msaidizi wako wa AKILI wa UDOM'}
          </p>
        </div>
        <div className="flex space-x-2">
          {chatHistory.length > 0 && (
            <button 
              onClick={clearChat}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-dark-hover transition-all duration-200"
              title={language === 'English' ? 'Clear Chat' : 'Futa Mazungumzo'}
            >
              <FiX className="text-lg" />
            </button>
          )}
          <button 
            onClick={() => window.open('https://www.udom.ac.tz', '_blank')}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-dark-hover transition-all duration-200"
            title="UDOM Website"
          >
            <FiGlobe className="text-lg" />
          </button>
        </div>
      </div>

      {/* FIXED: Twitter-like Chat Container with independent scrolling */}
      <div 
        ref={chatContainerRef}
        className="chat-messages flex-1 mb-4 overflow-y-auto custom-scrollbar"
        style={{ 
          maxHeight: 'calc(100vh - 300px)',
          minHeight: '400px'
        }}
      >
        {chatHistory.length === 0 ? (
          <div className="empty-chat text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMessageSquare className="text-2xl text-white" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              {language === 'English' ? 'Welcome to CiveGPT!' : 'Karibu kwenye CiveGPT!'}
            </h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              {language === 'English' 
                ? 'I can help you with campus navigation, academic resources, student services, and more. What would you like to know?'
                : 'Naweza kukusaidia kuhusu uelekezo wa kampasi, rasilimali za masomo, huduma za wanafunzi, na mengineyo. Ungependa kujua nini?'
              }
            </p>
            <div className="quick-questions grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
              {[
                language === 'English' ? "Where is the library?" : "Maktaba iko wapi?",
                language === 'English' ? "How to download timetable?" : "Nawezaje kupakua ratiba?",
                language === 'English' ? "Academic calendar dates" : "Tarehe za kalenda ya masomo",
                language === 'English' ? "Campus emergency contacts" : "Mawasiliano ya dharura ya kampasi"
              ].map((question, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(question)}
                  className="text-left p-3 bg-dark-hover rounded-lg hover:bg-gray-700 transition-all duration-200 text-sm text-gray-300 hover:text-white border border-gray-700"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`message-group ${msg.type === 'user' ? 'user-message' : 'bot-message'}`}
              >
                {/* Twitter-like Message Card */}
                <div className={`message-card rounded-2xl border ${
                  msg.type === 'user' 
                    ? 'bg-orange-500 border-orange-600 ml-auto' 
                    : 'bg-dark-surface border-gray-700'
                } max-w-2xl`}>
                  {/* Message Header */}
                  <div className="message-header flex items-center space-x-3 p-4 pb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      msg.type === 'user' ? 'bg-white' : 'bg-gray-600'
                    }`}>
                      {msg.type === 'user' ? (
                        <FiUser className={msg.type === 'user' ? 'text-orange-500' : 'text-white'} />
                      ) : (
                        <img src={Logo} alt="CiveGPT" className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${
                          msg.type === 'user' ? 'text-white' : 'text-white'
                        }`}>
                          {msg.type === 'user' 
                            ? (language === 'English' ? 'You' : 'Wewe')
                            : 'CiveGPT'
                          }
                        </span>
                        <span className="text-gray-400 text-sm">·</span>
                        <span className="text-gray-400 text-sm">{msg.timestamp}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className={`p-2 rounded-full ${
                        msg.type === 'user' 
                          ? 'hover:bg-orange-600 text-white' 
                          : 'hover:bg-gray-600 text-gray-400'
                      } transition-all duration-200`}
                    >
                      <FiCopy className="text-sm" />
                    </button>
                  </div>

                  {/* Message Content */}
                  <div className="message-content p-4 pt-2">
                    <p className={`whitespace-pre-wrap leading-relaxed ${
                      msg.type === 'user' ? 'text-white' : 'text-gray-100'
                    }`}>
                      {msg.content}
                    </p>
                  </div>

                  {/* Suggestions for bot messages */}
                  {msg.type === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="suggestions p-4 pt-2 border-t border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setQuery(suggestion)}
                            className="text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 px-3 py-1 rounded-full transition-all duration-200"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="bot-message">
                <div className="message-card bg-dark-surface border border-gray-700 rounded-2xl max-w-2xl">
                  <div className="message-header flex items-center space-x-3 p-4 pb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      <img src={Logo} alt="CiveGPT" className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-white">CiveGPT</span>
                    </div>
                  </div>
                  <div className="message-content p-4 pt-2">
                    <div className="typing-indicator flex space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-container bg-dark-surface rounded-2xl p-4 border border-gray-700">
        <div className="flex space-x-3">
          <input
            ref={textareaRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleQuery()}
            placeholder={language === 'English' 
              ? "Ask me anything about UDOM..." 
              : "Niulize chochote kuhusu UDOM..."
            }
            className="flex-1 bg-dark-hover border border-gray-700 rounded-full px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all duration-200"
            disabled={loading}
          />
          <button
            onClick={handleQuery}
            disabled={!query.trim() || loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 transform hover:scale-105"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <FiSend className="text-lg" />
            )}
          </button>
        </div>
        <div className="flex justify-between items-center mt-3">
          <p className="text-gray-400 text-xs">
            {language === 'English' 
              ? 'CiveGPT can make mistakes. Consider checking important information.'
              : 'CiveGPT anaweza kufanya makosa. Zingatia kuangalia taarifa muhimu.'
            }
          </p>
          <span className="text-gray-500 text-xs">
            {chatHistory.length} {language === 'English' ? 'messages' : 'ujumbe'}
          </span>
        </div>
      </div>
    </div>
  );

  // Render different tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="tab-content">
            <div className="welcome-banner bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-2xl mb-6 border border-orange-600">
              <h1 className="text-2xl font-bold mb-2">
                {language === 'English' ? 'Welcome to CiveGPT' : 'Karibu kwenye CiveGPT'}
              </h1>
              <p className="opacity-90">
                {language === 'English' 
                  ? 'Your AI assistant for UDOM campus life, academics, and student services'
                  : 'Msaidizi wako wa AKILI kwa maisha ya kampasi ya UDOM, masomo, na huduma za wanafunzi'
                }
              </p>
            </div>

            <div className="quick-actions-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="quick-action-card bg-dark-surface p-4 rounded-2xl hover:bg-dark-hover transition-all duration-200 text-left border border-gray-700 hover:border-orange-500/30"
                >
                  <action.icon className={`text-2xl mb-3 ${action.color}`} />
                  <h3 className="font-semibold text-white mb-1">
                    {language === 'English' ? action.title.en : action.title.sw}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {language === 'English' ? action.description.en : action.description.sw}
                  </p>
                </button>
              ))}
            </div>

            <div className="campus-highlights bg-dark-surface rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">
                {language === 'English' ? 'CIVE Buildings' : 'Majengo ya CIVE'}
              </h2>
              <div className="space-y-3">
                {Object.entries(civeBuildings).slice(0, 5).map(([key, building]) => (
                  <div key={key} className="building-item flex items-center justify-between p-3 bg-dark-hover rounded-xl hover:bg-gray-700 transition-all duration-200 border border-gray-600">
                    <div>
                      <h4 className="font-semibold text-white">{building.name}</h4>
                      <p className="text-gray-400 text-sm">{building.type}</p>
                    </div>
                    <button 
                      onClick={() => { setActiveTab('map'); setSelectedBuilding(key); }}
                      className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-all duration-200"
                    >
                      {language === 'English' ? 'View Map' : 'Angalia Ramani'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'map':
        return renderMap();

      case 'academics':
        return renderAcademics();

      case 'chat':
        return renderChat();

      default:
        return null;
    }
  };

  return (
    <div className="app-container bg-black min-h-screen text-white">
      {/* Top Navigation Bar */}
      <div className="top-nav border-b border-gray-800 bg-black/95 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <img src={Logo} alt="CiveGPT" className="w-8 h-8 rounded" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                CiveGPT
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-dark-hover transition-all duration-200">
                <FiSearch className="text-xl" />
              </button>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black border border-gray-700 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-orange-500 transition-all duration-200"
              >
                <option value="English">EN</option>
                <option value="Swahili">SW</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Desktop */}
          {!isMobile && (
            <div className="left-sidebar lg:w-64 flex-shrink-0">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`sidebar-tab w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 border ${
                      activeTab === tab.id 
                        ? 'bg-dark-surface text-white border-orange-500/30' 
                        : 'text-gray-400 hover:bg-dark-hover hover:text-white border-transparent hover:border-gray-600'
                    }`}
                  >
                    <tab.icon className="text-xl" />
                    <span className="font-medium">
                      {language === 'English' ? tab.label.en : tab.label.sw}
                    </span>
                  </button>
                ))}
              </nav>

              {/* Emergency Quick Action */}
              <div className="emergency-card mt-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <MdEmergency className="text-red-500 text-xl" />
                  <span className="font-semibold text-white">
                    {language === 'English' ? 'Emergency' : 'Dharura'}
                  </span>
                </div>
                <p className="text-red-400 text-sm mb-3">
                  {language === 'English' ? 'Campus Security' : 'Usalama wa Kampasi'}
                </p>
                <button 
                  onClick={() => window.open('tel:0755123456')}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105"
                >
                  {language === 'English' ? 'Call Now' : 'Piga Sasa'}
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className={`main-area flex-1 ${activeTab === 'chat' ? 'flex flex-col' : ''}`}>
            {renderTabContent()}
          </div>

          {/* Right Sidebar - Desktop */}
          {!isMobile && (
            <div className="right-sidebar lg:w-80 flex-shrink-0">
              <div className="campus-info bg-dark-surface rounded-2xl p-5 border border-gray-700">
                <h3 className="font-semibold text-white mb-3">
                  {language === 'English' ? 'CIVE Information' : 'Taarifa za CIVE'}
                </h3>
                <div className="space-y-3">
                  <div className="info-item">
                    <span className="text-gray-400 text-sm">
                      {language === 'English' ? 'Location:' : 'Mahali:'}
                    </span>
                    <p className="text-white">College of Informatics and Virtual Education</p>
                  </div>
                  <div className="info-item">
                    <span className="text-gray-400 text-sm">
                      {language === 'English' ? 'Buildings:' : 'Majengo:'}
                    </span>
                    <p className="text-white">{Object.keys(civeBuildings).length} {language === 'English' ? 'Main Buildings' : 'Majengo Makuu'}</p>
                  </div>
                  <div className="info-item">
                    <span className="text-gray-400 text-sm">
                      {language === 'English' ? 'Departments:' : 'Idara:'}
                    </span>
                    <p className="text-white">Computer Science, IT, Informatics</p>
                  </div>
                </div>
              </div>

              <div className="quick-links bg-dark-surface rounded-2xl p-5 mt-4 border border-gray-700">
                <h3 className="font-semibold text-white mb-3">
                  {language === 'English' ? 'Quick Links' : 'Viungo vya Haraka'}
                </h3>
                <div className="space-y-2">
                  <a href="https://www.udom.ac.tz" target="_blank" rel="noopener noreferrer" className="block text-orange-500 hover:text-orange-400 text-sm py-2 transition-all duration-200 flex items-center space-x-2">
                    <FiGlobe className="text-sm" />
                    <span>{language === 'English' ? 'Official Website' : 'Tovuti Rasmi'}</span>
                  </a>
                  <a href="https://ratiba.udom.ac.tz" target="_blank" rel="noopener noreferrer" className="block text-orange-500 hover:text-orange-400 text-sm py-2 transition-all duration-200 flex items-center space-x-2">
                    <FiCalendar className="text-sm" />
                    <span>{language === 'English' ? 'Timetable Portal' : 'Tovuti ya Ratiba'}</span>
                  </a>
                  <a href="https://library.udom.ac.tz" target="_blank" rel="noopener noreferrer" className="block text-orange-500 hover:text-orange-400 text-sm py-2 transition-all duration-200 flex items-center space-x-2">
                    <FiBookOpen className="text-sm" />
                    <span>{language === 'English' ? 'Online Library' : 'Maktaba Mtandaoni'}</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Mobile */}
      {isMobile && (
        <div className="bottom-nav fixed bottom-0 left-0 right-0 bg-black/95 border-t border-gray-800 backdrop-blur-lg">
          <div className="flex justify-around items-center py-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`mobile-tab flex flex-col items-center p-2 transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'text-orange-500 transform scale-110' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="text-xl mb-1" />
                <span className="text-xs">
                  {language === 'English' ? tab.label.en : tab.label.sw}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Content Padding */}
      {isMobile && <div className="pb-20"></div>}
    </div>
  );
}

export default App;