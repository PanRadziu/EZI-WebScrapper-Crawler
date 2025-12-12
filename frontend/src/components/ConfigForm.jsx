import { useState } from "react";
import { startCrawl } from "../api";
import toast from "react-hot-toast";
import React from "react";


export default function ConfigForm({ onStarted }) {
  const [config, setConfig] = useState({
    seed_url: "https://quotes.toscrape.com/",
    max_depth: 2,
    hard_link_limit: 50,
    search_method: "BFS",
    stay_in_domain: true,
    follow_robots_txt: false,
    obey_rate_limit: 0.5,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await startCrawl(config);
      toast.success("Crawler started!");
      onStarted(data.run_id);
    } catch (err) {
      toast.error("Failed to start crawl");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white shadow rounded-xl flex flex-col gap-3"
    >
      <h2 className="text-xl font-semibold mb-2">Konfiguracja crawl’a</h2>
      <label>
        Seed URL:
        <input
          type="text"
          name="seed_url"
          value={config.seed_url}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />
      </label>

      <label>
        Max Depth:
        <input
          type="number"
          name="max_depth"
          value={config.max_depth}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />
      </label>

      <label>
        Search Method:
        <select
          name="search_method"
          value={config.search_method}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        >
          <option value="BFS">BFS</option>
          <option value="DFS">DFS</option>
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="stay_in_domain"
          checked={config.stay_in_domain}
          onChange={handleChange}
        />
        Stay in domain
      </label>

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
      >
        Start Crawl
      </button>
    </form>
  );
}
