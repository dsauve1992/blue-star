import { Button } from "src/design-system/button";
import { Card, CardContent } from "src/design-system/card";
import { 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Zap,
  Star
} from "lucide-react";
import { Link } from "react-router";

export default function Home() {
  const features = [
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "Real-time Portfolio Tracking",
      description: "Monitor your investments with live market data and comprehensive analytics."
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Analytics",
      description: "Get detailed insights with professional-grade charts and performance metrics."
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure & Reliable",
      description: "Bank-level security with encrypted data storage and secure authentication."
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Lightning Fast",
      description: "Execute trades and access data with sub-second response times."
    }
  ];

  const stats = [
    { label: "Active Users", value: "10K+" },
    { label: "Portfolios Managed", value: "25K+" },
    { label: "Total Volume", value: "$2.5B+" },
    { label: "Success Rate", value: "99.9%" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-primary-500/10 border border-primary-500/20 rounded-md px-4 py-2 mb-8">
            <Star className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-500">Professional Trading Platform</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-slate-50 mb-6">
            Trade Smarter with
            <span className="text-gradient block">Blue Star</span>
          </h1>
          
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
            The most advanced portfolio management platform for serious traders. 
            Track, analyze, and optimize your investments with professional-grade tools.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="text-lg px-8 py-4" asChild>
              <Link to="/login">Get Started Free</Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4">
              View Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-slate-50 mb-2">{stat.value}</div>
                <div className="text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-50 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Professional-grade tools and insights designed for serious traders and investors.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-elevated transition-shadow">
                <CardContent className="p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500/10 rounded-md mb-6">
                    <div className="text-primary-500">
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-50 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-slate-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-50 mb-6">
            Ready to elevate your trading?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of traders who trust Blue Star for their portfolio management needs.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-8 py-4" asChild>
              <Link to="/login">Start Trading Now</Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-800 border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-md flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Blue Star</span>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-slate-300">
              <span>© 2024 Blue Star. All rights reserved.</span>
              <Link to="/settings" className="hover:text-slate-50 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/settings" className="hover:text-slate-50 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
