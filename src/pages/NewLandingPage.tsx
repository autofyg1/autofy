import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);
import { 
  ArrowRight, 
  Zap, 
  Workflow, 
  Sparkles,
  Shield,
  Clock,
  Users,
  BarChart3,
  Mail,
  MessageSquare,
  Calendar,
  Database,
  Bot
} from 'lucide-react';
import WorkflowDemo from '../components/WorkflowDemo';
import FeatureCard from '../components/FeatureCard';

const NewLandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    workflow: false,
    features: false
  });
  const [isHovering, setIsHovering] = useState(false);

  // 3D transform function for hero text
  const get3DTransform = (intensity: number) => {
    return `perspective(1000px) rotateX(${intensity * 2}deg) rotateY(${intensity * 3}deg) translateZ(${intensity * 20}px)`;
  };

  // GSAP ScrollTrigger animations
useEffect(() => {
  // Smooth scrolling setup
  gsap.config({ force3D: true });
  
  // Set initial states for elements - FIXED SELECTORS
  gsap.set(".hero-text h1", { y: 50, opacity: 0 });
  gsap.set(".hero-text p", { y: 50, opacity: 0 });
  gsap.set(".hero-buttons", { y: 50, opacity: 0 });
  gsap.set(".workflow-content", { y: 80, opacity: 0 });
  gsap.set(".feature-card", { y: 60, opacity: 0, scale: 0.8 });
  gsap.set(".integration-item", { y: 30, opacity: 0 });
  gsap.set(".stats-item", { y: 40, opacity: 0 });
  
  // Hero text animation - FIXED
  if (heroRef.current) {
    const tl = gsap.timeline({ delay: 0.5 });
    tl.to(".hero-text h1", {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: "power3.out"
    })
    .to(".hero-text p", {
      y: 0,
      opacity: 1,
      duration: 1,
      ease: "power2.out"
    }, "-=0.8")
    .to(".hero-buttons", {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power2.out"
    }, "-=0.6");
  }

    // Workflow section animation
    if (workflowRef.current) {
      gsap.to(".workflow-content", {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        stagger: 0.2,
        scrollTrigger: {
          trigger: workflowRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      });
    }

    // Features section animation
    if (featuresRef.current) {
      gsap.to(".feature-card", {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "back.out(1.7)",
        stagger: 0.1,
        scrollTrigger: {
          trigger: featuresRef.current,
          start: "top 75%",
          end: "bottom 25%",
          toggleActions: "play none none reverse"
        }
      });
    }

    // Integration items animation
    gsap.to(".integration-item", {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.05,
      scrollTrigger: {
        trigger: ".integration-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    // Stats animation
    gsap.to(".stats-item", {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.1,
      scrollTrigger: {
        trigger: ".stats-section",
        start: "top 80%",
        toggleActions: "play none none reverse"
      }
    });

    // Parallax effect for video
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: "top top",
      end: "bottom top",
      scrub: 1,
      onUpdate: (self) => {
        const video = heroRef.current?.querySelector('video');
        if (video) {
          gsap.to(video, {
            y: self.progress * 150,
            duration: 0.3,
            ease: "none"
          });
        }
      }
    });

    // Navbar background change on scroll
    ScrollTrigger.create({
      trigger: heroRef.current,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        const nav = document.querySelector('nav');
        if (nav) {
          if (self.progress > 0.1) {
            nav.classList.add('bg-white/95');
            nav.classList.remove('bg-white/90');
          } else {
            nav.classList.add('bg-white/90');
            nav.classList.remove('bg-white/95');
          }
        }
      }
    });

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Minimal Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Autofy</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              to="/login" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Sign in
            </Link>
            <Link 
              to="/signup" 
              className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="h-screen flex items-center justify-center relative overflow-hidden"
      >
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src="https://pmvzgrlufqgbxgpkaqke.supabase.co/storage/v1/object/public/video/background-video.mp4" type="video/mp4" />
            <div className="w-full h-full bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30"></div>
          </video>
          
          {/* Video overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70"></div>
        </div>

        {/* Animated particles */}
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
        
       {/* Hero Text Container - Positioned on Left */}
<div className="relative z-20 px-6 max-w-2xl text-center md:text-left md:max-w-4xl md:-top-24 md:left-[-200px] hero-text">
  {/* H1 outside the 3D transform div */}
  <h1 className="text-4xl md:text-7xl font-extrabold leading-tight text-white transform -translate-y-16 md:-translate-y-32">
    <span className="whitespace-nowrap">Automate Tasks</span>
    <br />
    <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
      Effortlessly
    </span>
  </h1>
  
  {/* Rest of content with 3D transform */}
  <div
    className="transform transition-all duration-1000"
    style={{ transform: get3DTransform(0.1) }}
  >
    <p className="text-xl md:text-xl text-white/90 mb-6 max-w-2xl leading-relaxed drop-shadow-lg mt-4">
      Transform your workflows with intelligent automation. Connect apps,
      eliminate repetitive tasks, and focus on what truly matters.
    </p>
    
    {/* FIXED BUTTON CONTAINER */}
    <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-3 sm:space-y-0 mt-6 hero-buttons">
      <Link
        to="/signup"
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

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/80 rounded-full mt-2 animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* Simple Workflow Demo */}
      <section 
        ref={workflowRef}
        className="py-16 px-6 bg-gray-50/50"
      >
        <div className="max-w-5xl mx-auto">
          <div className="workflow-content text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              See it in action
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Watch how easy it is to connect your favorite apps and automate your workflow
            </p>
          </div>

          {/* Workflow Demo */}
          <div className="workflow-content relative">
            <WorkflowDemo />
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section 
        ref={featuresRef}
        className="py-16 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div 
            className={`text-center mb-16 transform transition-all duration-1000 ${
              isVisible.features ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features that grow with your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Workflow,
                title: 'Visual Builder',
                description: 'Create workflows with our intuitive drag-and-drop interface. See your automation come to life.',
                delay: 'delay-100'
              },
              {
                icon: Sparkles,
                title: 'Smart Triggers',
                description: 'AI-powered triggers that understand context and respond to complex conditions automatically.',
                delay: 'delay-200'
              },
              {
                icon: Shield,
                title: 'Enterprise Ready',
                description: 'Bank-level security with SOC 2 compliance. Your data stays safe and private.',
                delay: 'delay-300'
              },
              {
                icon: Clock,
                title: 'Save Time',
                description: 'Reclaim 25+ hours per week by automating repetitive tasks and manual processes.',
                delay: 'delay-400'
              },
              {
                icon: Users,
                title: 'Team Collaboration',
                description: 'Share workflows, collaborate in real-time, and scale automation across your organization.',
                delay: 'delay-500'
              },
              {
                icon: BarChart3,
                title: 'Analytics',
                description: 'Track performance, monitor workflows, and optimize your automation with detailed insights.',
                delay: 'delay-600'
              }
            ].map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={feature.delay}
                isVisible={isVisible.features}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Simple Integration Preview */}
      <section className="integration-section py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Connect everything
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
            Works with the tools you already love
          </p>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'Gmail', icon: Mail, color: 'bg-red-500' },
              { name: 'Slack', icon: MessageSquare, color: 'bg-purple-500' },
              { name: 'Calendar', icon: Calendar, color: 'bg-blue-500' },
              { name: 'Notion', icon: Database, color: 'bg-gray-700' },
              { name: 'AI', icon: Bot, color: 'bg-violet-500' },
              { name: 'Workflow', icon: Workflow, color: 'bg-green-500' },
              { name: 'Analytics', icon: BarChart3, color: 'bg-orange-500' },
              { name: 'Security', icon: Shield, color: 'bg-blue-600' }
            ].map((app, index) => {
              const Icon = app.icon;
              return (
                <div 
                  key={app.name}
                  className="integration-item group flex flex-col items-center space-y-3 hover:scale-110 transition-transform duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-12 h-12 ${app.color} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{app.name}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-16">
            <p className="text-gray-500 mb-8">And 1000+ more integrations</p>
            <Link
              to="/signup"
              className="inline-flex items-center space-x-2 bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 hover:scale-105 transition-all duration-300"
            >
              <span>Start automating</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="stats-section py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="stats-item">
              <div className="text-4xl font-bold text-gray-900 mb-2">50K+</div>
              <p className="text-gray-600">Teams automated</p>
            </div>
            <div className="stats-item">
              <div className="text-4xl font-bold text-gray-900 mb-2">1M+</div>
              <p className="text-gray-600">Tasks completed</p>
            </div>
            <div className="stats-item">
              <div className="text-4xl font-bold text-gray-900 mb-2">99.9%</div>
              <p className="text-gray-600">Uptime guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to automate?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Join thousands of teams who save hours every week with intelligent automation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/signup"
              className="bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 hover:scale-105 transition-all duration-300"
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="text-white border border-white/20 px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
            >
              Sign in
            </Link>
          </div>
          
          <p className="text-gray-400 text-sm mt-6">
            No credit card required • Free forever plan available
          </p>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-6 h-6 rounded bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Autofy</span>
          </div>
          
          <div className="flex items-center space-x-8 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .font-inter {
          font-family: 'Inter', sans-serif;
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
          animation: float 6s ease-in-out infinite;
        }
        
        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }
        
        /* Responsive video layout styles */
        @media (max-width: 768px) {
          video {
            object-fit: cover !important;
            height: 100vh !important;
            background: #0f0f1a;
          }
          
          .hero-text {
            left: 0 !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            text-align: center !important;
            padding: 0 1rem !important;
            max-width: 100% !important;
            position: relative !important;
          }
          
          .hero-text h1 {
            font-size: 2.5rem !important;
            line-height: 1.2 !important;
          }
          
          .hero-text p {
            font-size: 1.1rem !important;
          }
          
          .hero-buttons {
            flex-direction: column !important;
            gap: 1rem !important;
            align-items: center !important;
            margin-top: 1.5rem !important;
          }
        }
        
       @media (min-width: 769px) {
  .hero-text {
    position: absolute !important;
    left: 4rem !important;
    top: 15% !important;  /* Changed from 50% to 40% to move it up */
    text-align: left !important;
    max-width: 600px !important;
    /* REMOVED: transform: translateY(-50%) !important; */
  }
}
        
        /* Focus states for accessibility */
        *:focus {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .bg-gradient-to-r {
            background: #000 !important;
            color: #fff !important;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          /* Disable GSAP animations for reduced motion */
          [data-gsap] {
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NewLandingPage;
