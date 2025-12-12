import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs } from "../api";
import { PlayCircle, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const { data } = await getJobs();
      setJobs(data);
    } catch (err) {
      console.error("Error fetching jobs", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "finished": return "bg-green-100 text-green-700 border-green-200";
      case "running": return "bg-blue-100 text-blue-700 border-blue-200 animate-pulse";
      case "error": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    if (status === "finished") return <CheckCircle size={16} />;
    if (status === "error") return <XCircle size={16} />;
    if (status === "running") return <PlayCircle size={16} />;
    return <Clock size={16} />;
  };

  if (loading && jobs.length === 0) return <div className="p-10 text-center text-gray-500">Loading history...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
            <p className="text-gray-500 mt-1">Overview of your recent crawling jobs.</p>
        </div>
        <Link to="/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
            <PlayCircle size={18}/> New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-dashed border-gray-300">
            <h3 className="text-xl font-semibold text-gray-700">It's empty here</h3>
            <p className="text-gray-500 mb-6">You haven't started any crawlers yet.</p>
            <Link to="/new" className="text-blue-600 hover:underline">Start your first crawl</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Seed URL</th>
                <th className="px-6 py-4">Stats</th>
                <th className="px-6 py-4">Started At</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.run_id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)}
                        {job.status.toUpperCase()}
                    </span>
                    {job.error && <div className="text-xs text-red-500 mt-1 max-w-[200px] truncate">{job.error}</div>}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800 truncate max-w-[250px]" title={job.seed_url}>
                    {job.seed_url}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex flex-col">
                        <span>Nodes: <b>{job.total_nodes}</b></span>
                        <span>Edges: <b>{job.total_edges}</b></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {job.started_at || "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                        to={`/run/${job.run_id}`} 
                        className="text-gray-400 hover:text-blue-600 group-hover:translate-x-1 transition-all inline-block"
                    >
                        <ArrowRight size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}