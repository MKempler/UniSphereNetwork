import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Globe, 
  Users, 
  Zap, 
  Languages, 
  ArrowRight, 
  Sparkles, 
  Network, 
  MessageCircle,
  Heart,
  Star,
  TrendingUp,
  Shield,
  GitBranch,
  X,
  CheckCircle,
  Clock,
  Wifi
} from 'lucide-react';

type FeatureModal = 'circuits' | 'translation' | 'decentralization' | null;

const LandingPage: React.FC = () => {
  const [activeModal, setActiveModal] = useState<FeatureModal>(null);

  const openModal = (feature: FeatureModal) => {
    setActiveModal(feature);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // Detailed explanations for each feature
  const featureDetails = {
    circuits: {
      title: "How Social Circuits Work",
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-500" />
              Interest-Based Communities
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Instead of following individual people, you join "circuits" centered around topics you're passionate about. 
              Whether it's renewable energy, indie music, or quantum physics, each circuit becomes a focused community 
              where like-minded people share ideas, ask questions, and collaborate.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Global by Design
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Since conversations are automatically translated, your local photography circuit might include 
              a street photographer from Tokyo, a landscape artist from Norway, and a portrait specialist from Brazil. 
              Geography becomes irrelevant when passion connects people.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Discovery & Serendipity
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Browse suggested circuits based on your interests, trending topics, or completely new areas you might 
              want to explore. Each circuit maintains its own culture and conversation style while staying connected 
              to the broader UniSphere community.
            </p>
          </div>
        </div>
      )
    },
    translation: {
      title: "Real-Time Translation Engine",
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-500" />
              How It Works
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Every piece of content on UniSphere is instantly translated to your preferred language using advanced AI. 
              Posts, comments, messages, even user profiles — everything appears in your language automatically. 
              You can also toggle to see original text anytime.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              Live Conversations
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Join live discussions where someone posts in Spanish, another responds in Mandarin, and you reply in English. 
              Everyone sees the conversation in their own language, creating truly global real-time discussions that 
              feel natural and seamless.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Context-Aware Translation
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Our translation understands context, slang, and community-specific terminology. Whether it's technical 
              jargon in a programming circuit or creative expression in an art community, translations preserve 
              meaning and tone, not just words.
            </p>
          </div>
        </div>
      )
    },
    decentralization: {
      title: "Unified Decentralization",
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-emerald-500" />
              Freedom Without Fragmentation
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Unlike traditional decentralized platforms that create isolated islands, UniSphere maintains 
              interconnectedness. Communities can be self-governed while still being discoverable and accessible 
              from the unified platform. No need to manage multiple accounts or lose connections.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Community Ownership
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Circuit moderators have real control over their communities' rules, culture, and governance. 
              Yet they benefit from shared infrastructure, translation services, and the ability for members 
              to seamlessly participate across multiple circuits without platform switching.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Wifi className="h-5 w-5 text-purple-500" />
              Seamless Experience
            </h4>
            <p className="text-gray-600 leading-relaxed">
              Your identity, connections, and preferences work across all circuits. Share a post from your 
              photography circuit with friends in your travel circuit. Get notifications from all your 
              communities in one place. It's decentralized infrastructure with centralized user experience.
            </p>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-cyan-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Network className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                UniSphere
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center max-w-5xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Building the future of social networking
            </div>
            <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Connect Without
              </span>
              <br />
              <span className="text-gray-800">Boundaries</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Break down language barriers and connect with minds worldwide. UniSphere uses real-time translation 
              and decentralized communities to bring people together, no matter where they are or what language they speak.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-lg px-8 py-4 h-auto shadow-xl"
              >
                <Link href="/feed">
                  <Globe className="h-5 w-5 mr-2" />
                  Enter UniSphere
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 h-auto">
                <Link href="/circuits">
                  <Users className="h-5 w-5 mr-2" />
                  Explore Circuits
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 px-6 bg-white/50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Why UniSphere is Different
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three revolutionary features that make global connection seamless
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Social Circuits */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Social Circuits</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Organized communities around shared interests and passions. Join conversations 
                  with people who share your enthusiasm, regardless of location or language.
                </p>
                <div className="flex items-center text-violet-600 font-semibold">
                  <span>Discover Circuits</span>
                  <button 
                    onClick={() => openModal('circuits')}
                    className="ml-2 p-1 hover:bg-violet-100 rounded-full transition-colors group/btn"
                  >
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Translation */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Languages className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">On-the-Fly Translation</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Break language barriers instantly. Every post, comment, and message is automatically 
                  translated in real-time to your preferred language, enabling truly global conversations.
                </p>
                <div className="flex items-center text-blue-600 font-semibold">
                  <span>No Barriers</span>
                  <button 
                    onClick={() => openModal('translation')}
                    className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors group/btn"
                  >
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Decentralized Unity */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <GitBranch className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Decentralization Without Fragmentation</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Enjoy the freedom of decentralized social networking while maintaining seamless 
                  connectivity. No silos, no isolation — just unified global community.
                </p>
                <div className="flex items-center text-emerald-600 font-semibold">
                  <span>Stay Connected</span>
                  <button 
                    onClick={() => openModal('decentralization')}
                    className="ml-2 p-1 hover:bg-emerald-100 rounded-full transition-colors group/btn"
                  >
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 px-6 bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-600 text-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Connecting People, No Matter Where
          </h2>
          <p className="text-xl leading-relaxed mb-8 text-white/90">
            UniSphere believes that meaningful conversations and genuine connections shouldn't be limited by 
            language barriers, geographic borders, or platform fragmentation. We're breaking down these barriers 
            with instant translation, thoughtful community design, and technology that brings the world closer together.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <span>Global Community</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              <span>Meaningful Connections</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span>Real-time Translation</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Decentralized & Open</span>
            </div>
          </div>
        </div>
      </section>

      {/* Current Status */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              Join the Journey
            </h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              UniSphere is actively in development, and we're excited to have early users help shape the future 
              of social networking. Join us as we build something revolutionary together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild 
                size="lg" 
                className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-lg px-8 py-4 h-auto"
              >
                <Link href="/register">
                  <Star className="h-5 w-5 mr-2" />
                  Be an Early User
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 h-auto">
                <Link href="/feed">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Explore the Platform
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Network className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">UniSphere</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <Link href="/circuits" className="hover:text-white transition-colors">Circuits</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 UniSphere. Building the future of social connection.</p>
          </div>
        </div>
      </footer>

      {/* Feature Detail Modals */}
      <Dialog open={activeModal === 'circuits'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              {featureDetails.circuits.title}
            </DialogTitle>
            <DialogDescription>
              Learn how Social Circuits create meaningful communities beyond geographical boundaries
            </DialogDescription>
          </DialogHeader>
          {featureDetails.circuits.content}
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'translation'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Languages className="h-5 w-5 text-white" />
              </div>
              {featureDetails.translation.title}
            </DialogTitle>
            <DialogDescription>
              Discover how real-time translation breaks down language barriers for global conversations
            </DialogDescription>
          </DialogHeader>
          {featureDetails.translation.content}
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === 'decentralization'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-white" />
              </div>
              {featureDetails.decentralization.title}
            </DialogTitle>
            <DialogDescription>
              Understand how UniSphere achieves decentralization without losing connectivity
            </DialogDescription>
          </DialogHeader>
          {featureDetails.decentralization.content}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage; 