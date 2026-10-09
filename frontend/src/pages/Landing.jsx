import { Link } from 'react-router-dom';
import { Leaf, Activity, Droplets, CloudSun } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <nav className="p-6 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <Leaf className="w-6 h-6" />
          PlantCare AI
        </div>
        <Link 
          to="/dashboard"
          className="bg-primary text-white px-6 py-2 rounded-full font-medium hover:bg-primary-light transition-colors"
        >
          Go to Dashboard
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto fade-in">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6">
            Grow Smarter. <br/>
            <span className="text-primary">Care Better.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            AI-powered plant health monitoring and personalized care for your urban garden.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/dashboard"
              className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Get Started
            </Link>
            <a 
              href="#features"
              className="w-full sm:w-auto bg-white text-gray-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow border border-gray-100"
            >
              Explore Features
            </a>
          </div>
        </div>

        <div className="mt-20">
          <img 
            src="https://images.pexels.com/photos/3125132/pexels-photo-3125132.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
            alt="Beautiful monstera plant" 
            className="w-full h-96 object-cover rounded-3xl shadow-2xl"
          />
        </div>

        <section id="features" className="py-24">
          <h2 className="text-3xl font-bold text-center mb-16">How we help your garden thrive</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon={Activity} 
              title="AI Plant Diagnosis" 
              description="Upload a plant leaf image and get AI-powered disease detection in seconds."
            />
            <FeatureCard 
              icon={Droplets} 
              title="Smart Watering" 
              description="Personalized watering recommendations based on plant info and environment."
            />
            <FeatureCard 
              icon={Leaf} 
              title="Plant Care" 
              description="Simple, actionable recommendations for keeping your plants healthy."
            />
            <FeatureCard 
              icon={CloudSun} 
              title="Weather-Aware" 
              description="Uses local weather conditions to improve watering and care insights."
            />
          </div>
        </section>

        <section className="py-20 bg-white rounded-3xl p-12 text-center shadow-sm">
          <h2 className="text-3xl font-bold mb-8">How it works</h2>
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 text-lg font-medium text-gray-700">
            <Step number="1" text="Add your plant" />
            <div className="hidden md:block w-12 border-t-2 border-dashed border-gray-300"></div>
            <Step number="2" text="Upload a photo" />
            <div className="hidden md:block w-12 border-t-2 border-dashed border-gray-300"></div>
            <Step number="3" text="Analyze health" />
            <div className="hidden md:block w-12 border-t-2 border-dashed border-gray-300"></div>
            <Step number="4" text="Get personalized care" />
          </div>
          
          <div className="mt-16">
            <Link 
              to="/dashboard"
              className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-dark transition-all shadow-lg"
            >
              Start Caring for Your Plants
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12 text-center mt-20">
        <div className="flex items-center justify-center gap-2 text-xl font-bold mb-4">
          <Leaf className="w-6 h-6 text-green-400" />
          AI Urban Farming Assistant
        </div>
        <p className="text-gray-400">Grow smarter. Live greener.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="w-14 h-14 bg-primary-light/10 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, text }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-primary">
        {number}
      </div>
      <span>{text}</span>
    </div>
  );
}
