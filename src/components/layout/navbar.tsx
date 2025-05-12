import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { X, Menu, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "AI Tools", href: "/ai-tools" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Help Center", href: "/help" },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-base/80 backdrop-blur-lg border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <Logo />
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location === item.href
                        ? "text-white"
                        : "text-light-base/70 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <Link href="/cart" className="mr-2">
                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-dark-card hover:bg-primary/10 relative transition-colors">
                  <ShoppingCart className="h-5 w-5 text-light-base" />
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">2</span>
                </button>
              </Link>
              
              {user ? (
                <>
                  <Link 
                    href="/dashboard"
                    className="px-4 py-2 rounded-md text-sm font-medium text-light-base/90 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/profile"
                    className="px-4 py-2 rounded-md text-sm font-medium text-light-base/90 hover:text-white transition-colors"
                  >
                    Profile
                  </Link>
                  <Button
                    onClick={handleLogout}
                    variant="default"
                    className="ml-3 bg-primary hover:bg-primary-light text-white transition-colors"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth"
                    className="px-4 py-2 rounded-md text-sm font-medium text-light-base/90 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth"
                    className="ml-3 px-4 py-2 rounded-md text-sm font-medium bg-primary hover:bg-primary-light text-white transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              className="bg-dark-card inline-flex items-center justify-center p-2 rounded-md text-light-base hover:text-white hover:bg-primary/30 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-dark-base flex flex-col"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 flex justify-between items-center border-b border-primary/20">
              <Logo />
              <button
                className="bg-dark-card p-2 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-light-base" />
              </button>
            </div>
            <div className="flex flex-col p-4 space-y-4">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-lg font-medium ${
                    location === item.href
                      ? "text-white"
                      : "text-light-base/70 hover:text-white transition-colors"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-primary/20">
              <Link 
                href="/cart" 
                className="flex items-center text-light-base/70 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                <span>Cart</span>
                <span className="ml-2 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">2</span>
              </Link>
            </div>
            
            <div className="mt-auto p-4 border-t border-primary/20">
              {user ? (
                <>
                  <Link 
                    href="/dashboard"
                    className="w-full py-2 mb-3 block text-center bg-transparent border border-primary/50 hover:border-primary text-white font-medium rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/profile"
                    className="w-full py-2 mb-3 block text-center bg-transparent border border-primary/50 hover:border-primary text-white font-medium rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 bg-primary hover:bg-primary-light text-white font-medium rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth"
                    className="w-full py-2 mb-3 block text-center bg-transparent border border-primary/50 hover:border-primary text-white font-medium rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth"
                    className="w-full py-2 block text-center bg-primary hover:bg-primary-light text-white font-medium rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default Navbar;
