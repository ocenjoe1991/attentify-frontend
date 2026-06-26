import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-white relative">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between p-3 lg:px-8" aria-label="Global">
          <div className="flex lg:flex-1">
            <Link to="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Attentify</span>
              <img className="h-12 w-auto" src="logo.png" alt="Attentify logo" />
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center  p-2.5 text-gray-700"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            <a href="#" className="text-sm font-semibold text-gray-900">Product</a>
            <a href="#" className="text-sm font-semibold text-gray-900">Solutions</a>
            <a href="#" className="text-sm font-semibold text-gray-900">Pricing</a>
            <a href="#" className="text-sm font-semibold text-gray-900">About Us</a>
            <a href="#" className="text-sm font-semibold text-gray-900">Support</a>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:justify-end sm:items-center">
            <a 
              onClick={() => navigate('/login')}
              className="mr-4 text-sm font-semibold text-gray-900 cursor-pointer">Log in</a>
            <a
              onClick={() => navigate('/signup')}
              className=" bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-indigo-600 cursor-pointer"
            >
              Start free trial
            </a>
          </div>
        </nav>

        {/* Mobile Menu Slide Panel (no backdrop) */}
        <div
          className={`fixed top-0 right-0 z-50 w-80 h-full bg-white shadow-lg px-6 py-6 transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <a href="#" className="-m-1.5 p-1.5">
              <img className="h-8 w-auto" src="logo.png" alt="Logo" />
            </a>
            <button
              type="button"
              className="-m-2.5  p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <a href="#" className="block text-base font-semibold text-gray-900">Product</a>
            <a href="#" className="block text-base font-semibold text-gray-900">Solutions</a>
            <a href="#" className="block text-base font-semibold text-gray-900">Pricing</a>
            <a href="#" className="block text-base font-semibold text-gray-900">About Us</a>
            <a href="#" className="block text-base font-semibold text-gray-900">Support</a>
            <a onClick={() => navigate('/login')} className="block text-base font-semibold text-gray-900 cursor-pointer">Log in</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        {/* Top Gradient Pattern */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            }}
          />
        </div>

        <div className="mx-auto max-w-2xl pt-10 py-32 sm:pt-20 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            AI-Powered Multi-Channel Support for Shopify Stores
          </h1>
          <p className="mt-8 text-lg font-medium text-gray-500 sm:text-xl">
            Automate refunds, cancellations & responses across<br />
            email, SMS, chat, and voice - all in one hub
          </p>
          <div className="mt-10 flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4">
            <a
              onClick={() => navigate('/signup')}
              className=" bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-500 cursor-pointer"
            >
              Start free trial
            </a>
            <a href="#" className="text-sm font-semibold text-gray-900">
              Learn more <span aria-hidden="true">-&gt;</span>
            </a>
          </div>

          {/* Centered Screenshot Image */}
          <div className="mt-16">
            <img
              src="/image.png"
              alt="Dashboard"
              className="mx-auto w-full max-w-xl  shadow-md"
            />
          </div>
        </div>

        {/* Bottom Gradient Pattern */}
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)"
            }}
          />
        </div>
      </div>

      {/* Static Feature Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 pb-32">
        {/* Feature 1 */}
        <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
          <div className="w-full lg:w-1/2">
            <img src="/image_1.png" alt="Feature 1" className=" shadow-md w-full h-auto object-cover" />
          </div>
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Feature Title 1</h2>
            <p className="text-gray-600 text-lg">This is a description of feature 1.</p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col-reverse lg:flex-row-reverse items-center gap-10">
          <div className="w-full lg:w-1/2">
            <img src="/image_2.png" alt="Feature 2" className=" shadow-md w-full h-auto object-cover" />
          </div>
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Feature Title 2</h2>
            <p className="text-gray-600 text-lg">This is a description of feature 2.</p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col-reverse lg:flex-row items-center gap-10">
          <div className="w-full lg:w-1/2">
            <img src="/image_3.png" alt="Feature 3" className=" shadow-md w-full h-auto object-cover" />
          </div>
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Feature Title 3</h2>
            <p className="text-gray-600 text-lg">This is a description of feature 3.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
