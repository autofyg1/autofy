import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  Zap, 
  ArrowRight, 
  Play, 
  CheckCircle, 
  Star,
  Github,
  Twitter,
  Mail,
  Sparkles,
  Clock,
  Users,
  Bot,
  Workflow,
  Shield,
  Palette,
  MousePointer,
  Code,
  Database,
  Globe,
  FileText,
  MessageCircle,
  Slack
} from 'lucide-react';

// Configuration objects for the Galaxy component - MORE ORBITS
const ORBITS = [
  { label: 'Gmail', Icon: Mail, radius: 100, baseSpeed: 10, hue: 220 },
  { label: 'Notion', Icon: FileText, radius: 140, baseSpeed: 10, hue: 280 },
  { label: 'Telegram', Icon: MessageCircle, radius: 180, baseSpeed: 10, hue: 200 },
  { label: 'Slack', Icon: Slack, radius: 220, baseSpeed: 10, hue: 120 },
  { label: 'Database', Icon: Database, radius: 260, baseSpeed: 10, hue: 30 },
  { label: 'Code', Icon: Code, radius: 300, baseSpeed: 10, hue: 260 },
  { label: 'Globe', Icon: Globe, radius: 340, baseSpeed: 10, hue: 180 },
  { label: 'AI', Icon: Sparkles, radius: 380, baseSpeed: 10, hue: 320 },
  { label: 'GitHub', Icon: Github, radius: 420, baseSpeed: 10, hue: 150 },
  { label: 'Bot', Icon: Bot, radius: 460, baseSpeed: 60, hue: 60 }
];

const SETTINGS = {
  nodeScaleRest: 1.0,
  nodeScaleHover: 1.18,
  speedBoost: 0.75,
  starCount: 140,
  pulseMin: 0.94,
  pulseMax: 1.06,
  nebulaCount: 3
};

const easing = {
  linear: [0, 0, 1, 1] as [number, number, number, number],
  soft: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 260, damping: 18, mass: 0.6 }
};

// Workflow Galaxy Component - COMPLETE WITH LEFT TEXT
const WorkflowGalaxyHero = () => {
  const prefersReducedMotion = useReducedMotion();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  const stars = useMemo(() => {
    return Array.from({ length: SETTINGS.starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.0 + Math.random() * 1.1,
      opacity: 0.25 + Math.random() * 0.7,
      duration: 2.2 + Math.random() * 4.6,
      delay: Math.random() * 6
    }));
  }, []);

  const nebulae = useMemo(() => {
    return Array.from({ length: SETTINGS.nebulaCount }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      size: 500 + Math.random() * 300,
      hue: 220 + Math.random() * 60,
      duration: 28 + Math.random() * 20,
      drift: (i % 2 === 0 ? 1 : -1) * (60 + Math.random() * 20)
    }));
  }, []);

  const phaseOffsets = useMemo(() => {
    return ORBITS.map(() => Math.random() * 360);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* CSS Styles */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--opacity-base); transform: scale(1); }
          50% { opacity: 1; transform: scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          .star { animation: none !important; }
          .orbit { animation-duration: 90s !important; }
          .nebula { animation: none !important; }
        }
      `}</style>

      {/* LEFT SIDE TEXT - "Ready to Automate" */}
      <div className="absolute left-8 top-1/2 transform -translate-y-1/2 z-30 ">
        <motion.div
          className="transform -rotate-90 origin-center"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >

<div className='flex flex-col items-start space-y-4'>

          <h2 className="text-4xl md:text-6xl font-bold text-white whitespace-nowrap mb-8">
            Ready to Automate
          </h2>
        <div className="flex flex-row items-center gap-6 mt-[150px]">
          <Link
              to="/auth"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Start Building
            </Link>
            <Link
              to="/demo"
              className="inline-block px-8 py-3 border border-gray-400 text-gray-300 font-semibold rounded-lg hover:border-gray-300 hover:text-white transition-all duration-300"
            >
              Watch Demo
            </Link>
             </div>
             </div>
        </motion.div>
      </div>

      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent" 
           style={{
             background: 'radial-gradient(ellipse at center, transparent 0%, transparent 70%, rgba(0,0,0,0.3) 100%)',
             mixBlendMode: 'multiply'
           }} />

      {/* Starfield */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute star rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            '--opacity-base': star.opacity,
            filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.4))',
            animation: prefersReducedMotion 
              ? 'none' 
              : `twinkle ${star.duration}s infinite ${star.delay}s ease-in-out`
          } as React.CSSProperties}
        />
      ))}

      {/* Nebulae */}
      {nebulae.map((nebula) => (
        <motion.div
          key={nebula.id}
          className="absolute nebula rounded-full pointer-events-none"
          style={{
            left: `${nebula.x}%`,
            top: `${nebula.y}%`,
            width: `${nebula.size}px`,
            height: `${nebula.size}px`,
            background: `radial-gradient(circle, hsla(${nebula.hue}, 70%, 60%, 0.15) 0%, transparent 70%)`,
            filter: 'blur(40px)',
            transform: 'translate(-50%, -50%)'
          }}
          animate={prefersReducedMotion ? {} : {
            x: [0, nebula.drift, 0]
          }}
          transition={{
            duration: nebula.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}

      {/* Main galaxy container */}
      <motion.div 
        className="relative flex items-center justify-center min-h-screen"
        whileHover={prefersReducedMotion ? {} : "hover"}
        initial="idle"
        variants={{
          idle: {},
          hover: {}
        }}
      >
       

        {/* Orbit rings and nodes - ALL 10 ORBITS REVOLVING */}
        {ORBITS.map((orbit, index) => {
          const { Icon } = orbit;
          // Better scaling for mobile devices
          const scaleFactor = windowWidth < 768 ? 0.4 : windowWidth < 1024 ? 0.6 : 0.8;
          const scaledRadius = orbit.radius * scaleFactor;
          
          return (
            <motion.div
              key={orbit.label}
              className="absolute orbit"
              style={{
                width: scaledRadius * 2,
                height: scaledRadius * 2,
                border: `1px solid hsla(${orbit.hue}, 50%, 60%, 0.15)`,
                borderRadius: '50%',
                boxShadow: `inset 0 0 20px hsla(${orbit.hue}, 50%, 60%, 0.1)`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: prefersReducedMotion ? 90 : orbit.baseSpeed,
                repeat: Infinity,
                ease: 'linear'
              }}
              variants={{
                idle: {
                  transition: { 
                    duration: orbit.baseSpeed,
                    repeat: Infinity,
                    ease: 'linear'
                  }
                },
                hover: {
                  transition: { 
                    duration: orbit.baseSpeed * SETTINGS.speedBoost,
                    repeat: Infinity,
                    ease: 'linear'
                  }
                }
              }}
              initial={{ rotate: phaseOffsets[index] }}
            >
              {/* Orbit node positioned on ring edge */}
              <motion.div
                className="absolute cursor-pointer"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translateX(${scaledRadius}px)`,
                  width: 'clamp(36px, 4vw, 48px)',
                  height: 'clamp(36px, 4vw, 48px)'
                }}
                tabIndex={0}
                role="button"
                aria-label={`${orbit.label} workflow node`}
                whileFocus={{
                  outline: '2px solid rgba(255, 255, 255, 0.6)',
                  outlineOffset: '2px'
                }}
              >
                <motion.div
                  className="w-full h-full rounded-full flex items-center justify-center text-white relative"
                  style={{
                    background: `radial-gradient(circle, hsla(${orbit.hue}, 60%, 50%, 0.8) 0%, hsla(${orbit.hue}, 50%, 40%, 0.6) 70%, transparent 100%)`,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid hsla(${orbit.hue}, 60%, 60%, 0.3)`
                  }}
                  animate={{
                    boxShadow: [
                      `0 0 15px hsla(${orbit.hue}, 60%, 50%, 0.6)`,
                      `0 0 25px hsla(${orbit.hue}, 60%, 50%, 1)`,
                      `0 0 15px hsla(${orbit.hue}, 60%, 50%, 0.6)`
                    ]
                  }}
                  variants={{
                    idle: { 
                      scale: SETTINGS.nodeScaleRest,
                      boxShadow: `0 0 15px hsla(${orbit.hue}, 60%, 50%, 0.6)`
                    },
                    hover: { 
                      scale: SETTINGS.nodeScaleHover,
                      boxShadow: `0 0 30px hsla(${orbit.hue}, 60%, 50%, 1.25)`
                    }
                  }}
                  transition={{
                    boxShadow: { duration: 3.0, repeat: Infinity, ease: 'easeInOut' },
                    scale: easing.spring
                  }}
                  whileHover={{
                    boxShadow: `0 0 25px hsla(${orbit.hue}, 60%, 50%, 1), inset 0 0 15px rgba(255, 255, 255, 0.2)`
                  }}
                >
                  <Icon size={scaleFactor < 0.6 ? 14 : 18} className="drop-shadow-sm" />
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Content section */}
      <div className="absolute bottom-0 left-0 right-0 text-center pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: easing.soft }}
          >

          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
            style={{ maxWidth: '60ch' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: easing.soft }}
          >
           
          </motion.p>
          <motion.div
            className="mt-8 space-x-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1, ease: easing.soft }}
          >
            
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const get3DTransform = (intensity: number = 1) => {
    if (typeof window === 'undefined') return 'none';
    
    const x = (mousePosition.x / window.innerWidth - 0.5) * intensity * 20;
    const y = (mousePosition.y / window.innerHeight - 0.5) * intensity * 20;
    return `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg)`;
  };

  const features = [
    {
      icon: Workflow,
      title: "Visual Workflow Builder",
      description: "Create complex automations with our intuitive drag-and-drop interface. No coding required.",
      color: "from-pink-400 to-rose-400"
    },
    {
      icon: Sparkles,
      title: "1000+ Integrations",
      description: "Connect all your favorite tools and services with pre-built connectors and APIs.",
      color: "from-purple-400 to-indigo-400"
    },
    {
      icon: Bot,
      title: "AI-Powered Automation",
      description: "Smart triggers and actions that learn from your patterns and optimize workflows.",
      color: "from-blue-400 to-cyan-400"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption and compliance with SOC2, GDPR, and HIPAA standards.",
      color: "from-green-400 to-emerald-400"
    }
  ];

  const integrations = [
    { name: "Slack", icon: "💬", color: "bg-purple-100" },
    { name: "Google Drive", icon: "📂", color: "bg-blue-100" },
    { name: "Notion", icon: "📝", color: "bg-gray-100" },
    { name: "Salesforce", icon: "⚡", color: "bg-indigo-100" },
    { name: "Shopify", icon: "🛍️", color: "bg-green-100" },
    { name: "GitHub", icon: "🐱", color: "bg-gray-100" },
    { name: "Airtable", icon: "📊", color: "bg-orange-100" },
    { name: "Discord", icon: "🎮", color: "bg-purple-100" },
    { name: "Stripe", icon: "💳", color: "bg-blue-100" },
    { name: "Zoom", icon: "🎥", color: "bg-blue-100" },
    { name: "Mailchimp", icon: "📧", color: "bg-yellow-100" },
    { name: "Trello", icon: "📋", color: "bg-blue-100" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager at TechFlow",
      avatar: "👩‍💼",
      content: "Autofy transformed our workflow efficiency by 300%. The visual builder is incredibly intuitive and powerful.",
      rating: 5,
      company: "TechFlow"
    },
    {
      name: "Marcus Johnson",
      role: "Operations Director",
      avatar: "👨‍💼",
      content: "Best automation platform we've used. Setup was seamless and the integrations work flawlessly.",
      rating: 5,
      company: "InnovateCorp"
    },
    {
      name: "Elena Rodriguez",
      role: "Marketing Lead",
      avatar: "👩‍🚀",
      content: "Saved us 25+ hours weekly on repetitive tasks. The AI suggestions are spot-on every time.",
      rating: 5,
      company: "GrowthLab"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden relative">
      {/* Floating 3D Elements */}
      <div className="fixed inset-0 pointer-events-none z-10">
        <div 
          className="absolute top-20 left-20 w-16 h-16 opacity-20"
          style={{ transform: get3DTransform(0.5) }}
        >
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
        </div>
        <div 
          className="absolute top-40 right-32 w-12 h-12 opacity-20"
          style={{ transform: get3DTransform(-0.3) }}
        >
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>
        <div 
          className="absolute bottom-40 left-32 w-14 h-14 opacity-20"
          style={{ transform: get3DTransform(0.8) }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg flex items-center justify-center">
            <Workflow className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/5 dark:bg-black/5 backdrop-blur-3xl border-b border-white/10 dark:border-gray-800/30 shadow-lg shadow-black/5">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Autofy
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <a href="#product" className="text-white/90 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
              Product
            </a>
            <a href="#solutions" className="text-white/90 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
              Solutions
            </a>
            <a href="#pricing" className="text-white/90 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
              Pricing
            </a>
            <a href="#docs" className="text-white/90 hover:text-white font-medium px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
              Docs
            </a>
          </div>

          <div className="flex items-center space-x-3">
            <Link 
              to="/auth" 
              className="text-white/80 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
            >
              Sign In
            </Link>
            <Link 
              to="/auth" 
              className="relative overflow-hidden bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-2 rounded-lg font-medium hover:shadow-xl transition-all hover:scale-[1.02] group"
            >
              <span className="relative z-10">Sign Up</span>
              <span className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Background Video - FIXED RESPONSIVE */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="/background-video.mp4" type="video/mp4" />
            <div className="w-full h-full bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100"></div>
          </video>
          
          {/* Enhanced Responsive CSS - FIXED STYLES */}
          <style jsx>{`
            @media (max-width: 768px) {
              video {
                object-fit: cover !important;
                height: 100vh !important;
                background: #0f0f1a;
              }
              
              .hero-text {
                left: 0 !important;
                top: -15% !important;
                transform: translateY(-40%) !important; /
                text-align: center !important;
                padding: 0 1rem !important;
                max-width: 100% !important;
              }
              
              .hero-text h1 {
              
                font-size: 2.2rem !important;
                line-height: 1.2 !important;
              }
              
              .hero-text p {
                font-size: 1rem !important;
              }
              
              .hero-buttons {
                flex-direction: column !important;
                gap: 1rem !important;
                align-items: center !important;
                margin-top: 1.5rem !important;
              }
            }
          `}</style>
          
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30"></div>
        </div>

        <div className="absolute inset-0 z-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* FIXED HERO TEXT CONTAINER */}
        <div className="relative z-20 px-6 max-w-2xl text-center md:text-left md:max-w-4xl md:-top-16 md:left-[-200px] hero-text">
          <div
            className="transform transition-all duration-1000"
            style={{ transform: get3DTransform(0.1) }}
          >
            <h1 className="text-xl md:text-7xl font-extrabold leading-tight text-white">
              Automate Tasks{' '}
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Effortlessly
              </span>
            </h1>
            <p className="text-xl md:text-xl text-white/90 mb-6 max-w-2xl leading-relaxed drop-shadow-lg mt-4">
              Transform your workflows with intelligent automation.Connect apps,
              eliminate repetitive tasks, and focus on what truly matters.
            </p>
            
            {/* FIXED BUTTON CONTAINER */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0 mt-6 hero-buttons">
              <Link
                to="/auth"
                className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span>Get Started Free</span>
                <ArrowRight
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isHovering ? 'translate-x-1' : ''
                  }`}
                />
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/80 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 text-gray-900">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Autofy?
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful automation features designed for modern teams. Simple to use, impossible to outgrow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index} 
                  className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 hover:border-gray-200 cursor-pointer"
                  style={{ 
                    transform: typeof window !== 'undefined' ? 
                      `perspective(1000px) rotateX(${(mousePosition.y / window.innerHeight - 0.5) * -5}deg) rotateY(${(mousePosition.x / window.innerWidth - 0.5) * 5}deg)` : 
                      'none',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integration Showcase */}
      <section className="py-24 px-6 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-900">Connect Everything</h2>
          <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
            Seamlessly integrate with 1000+ apps and services you already use
          </p>

          <div className="relative overflow-hidden">
            <div className="flex animate-scroll space-x-8 w-max">
              {[...integrations, ...integrations].map((integration, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 w-24 h-24 ${integration.color} rounded-2xl flex flex-col items-center justify-center group hover:scale-110 transition-transform duration-300 shadow-lg cursor-pointer`}
                >
                  <div className="text-2xl mb-1">{integration.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{integration.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Loved by 50,000+ Teams</h2>
            <p className="text-xl text-gray-600">
              Join thousands of companies automating their workflows with Autofy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group"
                style={{ transform: get3DTransform(0.05) }}
              >
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 text-lg leading-relaxed">
                  "{testimonial.content}"
                </blockquote>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

       {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl font-bold mb-6">Ready to Automate?</h2>
          <p className="text-xl mb-12 opacity-90 max-w-2xl mx-auto">
            Join 50,000+ teams already saving time with intelligent automation. Start free, no credit card required.
          </p>
          <Link 
            to="/signup"
            className="inline-flex items-center space-x-3 bg-white text-purple-600 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            <span>Start Automating Now</span>
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>


{/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">Autofy</span>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                The most powerful automation platform for modern teams. Simple, secure, scalable.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-lg">Product</h3>
              <div className="space-y-4">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Features</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Integrations</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Templates</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">API</a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-lg">Company</h3>
              <div className="space-y-4">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">About</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Careers</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Blog</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Press</a>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-lg">Support</h3>
              <div className="space-y-4">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Documentation</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Community</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Help Center</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">&copy; 2025 Autofy. All rights reserved.</p>
            <div className="flex space-x-8 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`

//       @keyframes floatGlow {
//   0%, 100% { 
//     transform: translateY(0px); 
//     text-shadow: 0 0 20px rgba(255,255,255,0.3);
//   }
//   50% { 
//     transform: translateY(-8px); 
//     text-shadow: 0 0 30px rgba(255,255,255,0.6);
//   }
// }

// .hero-text h1 {
//   animation: floatGlow 2.5s ease-in-out infinite;
// }
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;