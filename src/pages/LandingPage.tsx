import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  Users
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const LandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hero animation
    if (heroRef.current) {
      const tl = gsap.timeline();
      tl.fromTo('.hero-title', 
        { y: 100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power2.out" }
      )
      .fromTo('.hero-subtitle',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.5"
      )
      .fromTo('.hero-cta',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
        "-=0.3"
      );
    }

    // Features animation
    if (featuresRef.current) {
      gsap.fromTo('.feature-card',
        { y: 80, opacity: 0, scale: 0.9 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 80%",
            end: "bottom 20%",
          }
        }
      );
    }

    // Testimonials animation
    if (testimonialsRef.current) {
      gsap.fromTo('.testimonial-card',
        { x: 100, opacity: 0 },
        { 
          x: 0, 
          opacity: 1,
          duration: 0.8,
          stagger: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: testimonialsRef.current,
            start: "top 80%",
            end: "bottom 20%",
          }
        }
      );
    }

    // Floating animation for background elements
    gsap.to('.floating-icon', {
      y: -20,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut",
      stagger: 0.5
    });

  }, []);

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast Setup",
      description: "Create powerful automations in minutes, not hours. Our intuitive builder makes it easy."
    },
    {
      icon: Sparkles,
      title: "Smart Integrations",
      description: "Connect 1000+ apps with intelligent triggers and actions. Everything works seamlessly."
    },
    {
      icon: Clock,
      title: "Real-time Monitoring",
      description: "Track your automations in real-time with detailed analytics and instant notifications."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share and collaborate on automations with your team. Built for modern workflows."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager at TechCorp",
      content: "AutoFlow saved us 20+ hours per week. The interface is intuitive and the integrations are rock solid.",
      rating: 5
    },
    {
      name: "Mike Rodriguez",
      role: "Marketing Director",
      content: "Best automation platform I've used. The visual builder makes complex workflows simple to create.",
      rating: 5
    },
    {
      name: "Jessica Park",
      role: "Operations Lead",
      content: "Incredible time-saver. Our team productivity increased by 40% since implementing AutoFlow.",
      rating: 5
    }
  ];

  const scrollToDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              AutoFlow
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="text-gray-300 hover:text-white transition-colors">Testimonials</a>
            <Link 
              to="/dashboard" 
              className="bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-2 rounded-lg font-medium hover:scale-105 transition-transform duration-300"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="border border-gray-600 px-6 py-2 rounded-lg font-medium hover:border-gray-500 transition-colors duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-6">
        {/* Floating background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="floating-icon absolute top-20 left-20 w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <div className="floating-icon absolute top-40 right-32 w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-violet-400" />
          </div>
          <div className="floating-icon absolute bottom-40 left-32 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="hero-title text-6xl md:text-7xl font-bold mb-6">
            Automate Your Workflow,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-green-400 bg-clip-text text-transparent">
              Effortlessly
            </span>
          </h1>
          <p className="hero-subtitle text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Connect your favorite apps and automate repetitive tasks with our visual workflow builder. 
            Save time, reduce errors, and focus on what matters most.
          </p>
          <div className="hero-cta flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link 
              to="/signup"
              className="bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-4 rounded-xl font-semibold text-lg hover:scale-105 transition-transform duration-300 flex items-center space-x-2"
            >
              <span>Start Automating</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button 
              onClick={scrollToDemo}
              className="border border-gray-600 px-8 py-4 rounded-xl font-semibold text-lg hover:border-gray-500 transition-colors duration-300 flex items-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Watch Live Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                AutoFlow
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Powerful features designed to make automation simple, fast, and reliable for teams of all sizes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-card bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo-section" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">See AutoFlow in Action</h2>
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center">
              <button className="w-20 h-20 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300">
                <Play className="w-8 h-8 text-white ml-1" />
              </button>
            </div>
            <p className="text-gray-300 mt-6">
              Watch how easy it is to create your first automation in under 2 minutes
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" ref={testimonialsRef} className="py-20 px-6 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by Thousands</h2>
            <p className="text-xl text-gray-300">
              Join over 10,000+ users who have transformed their workflows
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AutoFlow</span>
              </div>
              <p className="text-gray-400 mb-4">
                The most powerful automation platform for modern teams.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/dashboard" className="block text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="block text-gray-400 hover:text-white transition-colors">
                  Sign Up
                </Link>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Support
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <div className="space-y-2">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  API Documentation
                </a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Templates
                </a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Community
                </a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  GitHub
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AutoFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;