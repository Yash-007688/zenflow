import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, UserCheck, UserMinus, History, Zap } from 'lucide-react';
import { format } from 'date-fns';

const SOCKET_URL = 'http://localhost:5000';

interface Session {
  date: string;
  start: string;
  end: string;
  duration_seconds: number;
  type: string;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<'At Desk' | 'Away'>('Away');
  const [permanentSession, setPermanentSession] = useState<{ log_on_time: string, is_active: number } | null>(null);
  const [logs, setLogs] = useState<Session[]>([]);
  const [totalAwayTime, setTotalAwayTime] = useState(0);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('status_change', (data: { status: 'At Desk' | 'Away' }) => {
      setStatus(data.status);
      fetchLogs();
    });

    s.on('permanent_status_change', () => {
      fetchLogs();
    });

    const fetchLogs = async () => {
      try {
        const response = await fetch(`${SOCKET_URL}/logs`);
        const data = await response.json();
        setLogs(data.partial);
        setPermanentSession(data.permanent);
        const total = data.partial.reduce((acc: number, log: Session) => acc + log.duration_seconds, 0);
        setTotalAwayTime(total);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };

    fetchLogs();

    return () => {
      s.disconnect();
    };
  }, []);

  const handleLogOffPermanent = () => {
    if (socket) {
      socket.emit('log_off_permanently', {});
      setPermanentSession(null);
    }
  };

  return (
    <div className="min-h-screen p-8 relative overflow-hidden flex flex-col items-center">
      {/* Background Effects */}
      <div className="absolute inset-0 cyber-grid -z-10 opacity-20"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-blue/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-purple/20 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>

      {/* Header */}
      <header className="w-full max-w-6xl mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter neo-glow-blue text-cyber-blue mb-2">ZENFLOW</h1>
          <div className="flex items-center gap-3">
            <p className="text-white/40 font-mono tracking-widest text-xs uppercase">Autonomous Presence Tracker v1.0</p>
            {permanentSession?.is_active && (
              <span className="px-2 py-0.5 bg-cyber-green/10 text-cyber-green border border-cyber-green/30 text-[10px] font-mono rounded animate-pulse">SESSION ACTIVE</span>
            )}
          </div>
        </div>
        <div className="glass px-6 py-4 flex items-center gap-4">
          <Clock className="text-cyber-green w-6 h-6" />
          <span className="text-2xl font-mono text-white/90">
            {format(new Date(), 'HH:mm:ss')}
          </span>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Card */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <motion.div
            className={`glass p-12 relative overflow-hidden group transition-all duration-500 ${status === 'At Desk' ? 'border-cyber-green/30' : 'border-cyber-pink/30'}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <motion.div
                animate={{
                  scale: status === 'At Desk' ? [1, 1.1, 1] : 1,
                  opacity: status === 'At Desk' ? 1 : 0.5
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center ${status === 'At Desk' ? 'bg-cyber-green/20 text-cyber-green' : 'bg-cyber-pink/20 text-cyber-pink'}`}
              >
                {status === 'At Desk' ? <UserCheck size={64} /> : <UserMinus size={64} />}
              </motion.div>

              <h2 className="text-2xl font-mono text-white/60 mb-2 uppercase tracking-[0.2em]">Current State</h2>
              <div className={`text-8xl font-black italic tracking-tighter mb-4 ${status === 'At Desk' ? 'text-cyber-green drop-shadow-[0_0_20px_rgba(0,255,159,0.5)]' : 'text-cyber-pink drop-shadow-[0_0_20px_rgba(255,0,110,0.5)]'}`}>
                {status.toUpperCase()}
              </div>

              <p className="text-white/40 max-w-md mx-auto">
                {status === 'At Desk'
                  ? "Presence confirmed. Efficiency protocols active. Calculating deep study session..."
                  : "Desk is unoccupied. Auto-logging partial away session. Log starts on return."}
              </p>
            </div>

            {/* Background scanner animation */}
            <div className={`absolute inset-0 opacity-10 pointer-events-none ${status === 'At Desk' ? 'bg-gradient-to-t from-cyber-green/20 via-transparent' : 'bg-gradient-to-t from-cyber-pink/20 via-transparent'}`}></div>
          </motion.div>

          <div className="grid grid-cols-3 gap-8">
            <div className="glass p-8">
              <Zap className="text-cyber-green mb-4" />
              <div className="text-sm font-mono text-white/40 uppercase tracking-widest mb-1">Permanent Log On</div>
              <div className="text-2xl font-black font-mono text-cyber-green">
                {permanentSession ? format(new Date(permanentSession.log_on_time), 'HH:mm:ss') : '--:--:--'}
              </div>
            </div>
            <div className="glass p-8">
              <History className="text-cyber-purple mb-4" />
              <div className="text-sm font-mono text-white/40 uppercase tracking-widest mb-1">Total Away Time</div>
              <div className="text-4xl font-black font-mono text-cyber-purple">
                {Math.round(totalAwayTime / 60)} <span className="text-lg">MINS</span>
              </div>
            </div>
            <button
              onClick={handleLogOffPermanent}
              disabled={!permanentSession?.is_active}
              className={`glass p-8 group transition-all duration-300 ${permanentSession?.is_active ? 'hover:bg-cyber-pink/20 border-cyber-pink/30 cursor-pointer' : 'opacity-50 grayscale cursor-not-allowed'}`}
            >
              <UserMinus className="text-cyber-pink mb-4 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-mono text-white/40 uppercase tracking-widest mb-1">Permanent</div>
              <div className="text-2xl font-black font-mono text-cyber-pink group-hover:neo-glow-pink transition-all">LOG OFF</div>
            </button>
          </div>
        </div>

        {/* Logs Card */}
        <div className="flex flex-col h-[700px]">
          <div className="glass flex-1 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <History className="text-cyber-blue" />
              <h3 className="text-xl font-bold tracking-tight text-white/90">SESSION LOGS</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <AnimatePresence mode='popLayout'>
                {logs.length === 0 ? (
                  <div className="text-white/20 text-center py-20 font-mono italic">No logs detected yet...</div>
                ) : (
                  logs.map((log) => (
                    <motion.div
                      key={log.start}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="mb-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{log.date}</span>
                        <span className="text-xs font-mono text-cyber-pink">-{Math.round(log.duration_seconds)}s</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-cyber-blue">{format(new Date(log.start), 'HH:mm')} - {format(new Date(log.end), 'HH:mm')}</span>
                      </div>
                      <div className="text-sm text-white/70 font-medium font-mono uppercase tracking-tighter">Partial Away Session</div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="text-xs font-mono text-white/20 uppercase text-center tracking-widest">End of Daily Logs</div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 text-white/20 font-mono text-[10px] tracking-[0.3em] uppercase">
        Secure Study Monitoring Sequence • {status === 'At Desk' ? 'Live' : 'Standby'}
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 242, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 242, 255, 0.4);
        }
      `}</style>
    </div>
  );
};

export default App;
