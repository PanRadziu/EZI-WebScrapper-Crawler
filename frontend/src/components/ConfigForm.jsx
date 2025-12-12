import { useState } from "react";
import { startCrawl } from "../api";
import toast from "react-hot-toast";

export default function ConfigForm({ onStarted }) {
  const [config, setConfig] = useState({
    seed_url: "https://quotes.toscrape.com/",
    max_depth: 2,
    hard_link_limit: 50,
    search_method: "BFS",
    stay_in_domain: true,
    follow_robots_txt: false,
    obey_rate_limit: 0.5,
    global_timeout: 600,
    user_agents_str: "",
    proxy_list_str: "",
    allow_patterns_str: "",
    deny_patterns_str: ""
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const splitByLine = (str) => str.split("\n").map(s => s.trim()).filter(s => s.length > 0);

    const payload = {
      ...config,
      max_depth: parseInt(config.max_depth),
      hard_link_limit: parseInt(config.hard_link_limit),
      obey_rate_limit: parseFloat(config.obey_rate_limit),
      global_timeout: parseFloat(config.global_timeout),
      user_agents: splitByLine(config.user_agents_str).length > 0 ? splitByLine(config.user_agents_str) : null,
      proxy_list: splitByLine(config.proxy_list_str).length > 0 ? splitByLine(config.proxy_list_str) : null,
      link_filter: {
        allow_patterns: splitByLine(config.allow_patterns_str).length > 0 ? splitByLine(config.allow_patterns_str) : null,
        deny_patterns: splitByLine(config.deny_patterns_str).length > 0 ? splitByLine(config.deny_patterns_str) : null,
      }
    };

    delete payload.user_agents_str;
    delete payload.proxy_list_str;
    delete payload.allow_patterns_str;
    delete payload.deny_patterns_str;

    try {
      const { data } = await startCrawl(payload);
      toast.success("Crawler started!");
      onStarted(data.run_id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to start crawler. Check console.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-white shadow-lg rounded-xl flex flex-col gap-4 max-w-4xl mx-auto"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Crawler Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1 md:col-span-2">
          <label className="block font-semibold mb-1">Seed URL</label>
          <input
            type="url"
            required
            name="seed_url"
            value={config.seed_url}
            onChange={handleChange}
            className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Search Method</label>
          <select
            name="search_method"
            value={config.search_method}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          >
            <option value="BFS">BFS</option>
            <option value="DFS">DFS</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Max Depth</label>
          <input
            type="number"
            min="0"
            max="10"
            name="max_depth"
            value={config.max_depth}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
        <div>
          <label className="block font-semibold mb-1 text-sm">Max Links (Hard Limit)</label>
          <input
            type="number"
            name="hard_link_limit"
            value={config.hard_link_limit}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1 text-sm">Delay (s)</label>
          <input
            type="number"
            step="0.1"
            name="obey_rate_limit"
            value={config.obey_rate_limit}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1 text-sm">Time Limit (s)</label>
          <input
            type="number"
            name="global_timeout"
            value={config.global_timeout}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
        
        <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm">User Agents (one per line)</label>
            <textarea
                name="user_agents_str"
                value={config.user_agents_str}
                onChange={handleChange}
                rows={3}
                className="border p-2 w-full rounded text-xs font-mono"
                placeholder="Mozilla/5.0..."
            />

            <label className="font-semibold text-sm">Proxy List (http://user:pass@ip:port)</label>
            <textarea
                name="proxy_list_str"
                value={config.proxy_list_str}
                onChange={handleChange}
                rows={3}
                className="border p-2 w-full rounded text-xs font-mono"
                placeholder="http://10.10.1.1:8080"
            />
        </div>

        <div className="flex flex-col gap-2">
            <label className="font-semibold text-sm text-green-700">Allow Patterns (Regex, one per line)</label>
            <textarea
                name="allow_patterns_str"
                value={config.allow_patterns_str}
                onChange={handleChange}
                rows={3}
                className="border p-2 w-full rounded text-xs font-mono border-green-200 bg-green-50"
                placeholder="/blog/.*"
            />

            <label className="font-semibold text-sm text-red-700">Deny Patterns (Regex, one per line)</label>
            <textarea
                name="deny_patterns_str"
                value={config.deny_patterns_str}
                onChange={handleChange}
                rows={3}
                className="border p-2 w-full rounded text-xs font-mono border-red-200 bg-red-50"
                placeholder=".*\.pdf$"
            />
        </div>
      </div>

      <div className="flex items-center gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="stay_in_domain"
            checked={config.stay_in_domain}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <span className="text-sm">Stay in domain</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="follow_robots_txt"
            checked={config.follow_robots_txt}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <span className="text-sm">Respect robots.txt</span>
        </label>
      </div>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded mt-2 transition-colors"
      >
        START CRAWLER
      </button>
    </form>
  );
}