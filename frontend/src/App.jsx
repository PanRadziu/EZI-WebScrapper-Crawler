import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LayoutDashboard, PlusCircle, Activity, Globe } from "lucide-react";

import ConfigForm from "./components/ConfigForm";
import ResultPanel from "./components/ResultPanel";
import GraphView from "./components/GraphView";
import Dashboard from "./pages/Dashboard";

function Sidebar() {
  const location = useLocation();
  
  const NavItem = ({ to, icon: Icon, label }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          active 
            ? "bg-blue-600 text-white shadow-md" 
            : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-white border-r h-screen flex flex-col p-4 fixed left-0 top-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Globe className="text-blue-600" size={32} />
        <h1 className="text-xl font-bold text-gray-800">Crawler/Scraper</h1>
      </div>
      
      <nav className="flex flex-col gap-2">
        <NavItem to="/" icon={LayoutDashboard} label="Job History" />
        <NavItem to="/new" icon={PlusCircle} label="New Crawl" />
      </nav>

      <div className="mt-auto text-xs text-gray-400 px-2">
        v1.0.0 by PanRadziu
      </div>
    </div>
  );
}

function NewCrawlPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Start New Crawl</h2>
      <ConfigForm onStarted={(runId) => navigate(`/run/${runId}`)} />
    </div>
  );
}

function RunDetailsPage() {
  const runId = window.location.pathname.split("/").pop();
  const [result, setResult] = React.useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Job Details</h2>
        <span className="text-sm text-gray-500 font-mono bg-gray-200 px-2 py-1 rounded">ID: {runId}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr,2fr] gap-6">
        <ResultPanel runId={runId} onResult={setResult} />
        
        <div className="bg-white rounded-xl shadow-sm border p-4 h-[600px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={18} /> Link Visualization
          </h3>
          <div className="flex-1 bg-gray-50 rounded border border-gray-100 overflow-hidden">
             <GraphView data={result} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Toaster position="bottom-right" />
        <Sidebar />
        
        <main className="ml-64 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewCrawlPage />} />
            <Route path="/run/:runId" element={<RunDetailsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}