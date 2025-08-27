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