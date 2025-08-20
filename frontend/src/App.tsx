import { fetchQueryResult } from './fetchQueryResult';
import { getToken, setToken as saveToken, clearToken } from './auth';
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Send, 
  Moon, 
  Sun, 
  Github, 
  Linkedin,
  AlertCircle,
  CheckCircle,
  Code,
  Table,
  Sparkles,
  RefreshCcw,
  Layers
} from 'lucide-react';

interface QueryResult {
  columns: string[];
  rows: (string | number)[][];
}

interface SQLQuery {
  query: string;
  explanation: string;
}

function App() {
  const [question, setQuestion] = useState('');
  const [sqlQuery, setSqlQuery] = useState<SQLQuery | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [token, setToken] = useState<string | null>(getToken());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [freshness, setFreshness] = useState<Array<{table: string, timestamp_column: string|null, last_loaded: string|null}> | null>(null);
  const [schemaJson, setSchemaJson] = useState<any | null>(null);
  const [semanticJson, setSemanticJson] = useState<any | null>(null);
  const [suggestedSemantic, setSuggestedSemantic] = useState<any | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (authMode === 'register') {
        const r = await fetch('http://localhost:8000/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || 'Registration failed');
        }
      }

      const res = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }
      saveToken(data.access_token);
      setToken(data.access_token);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setToken(null);
    setSqlQuery(null);
    setResults(null);
    setQuestion('');
  };

  useEffect(() => {
    if (token) {
      fetchFreshness();
      loadSchema();
      loadSemantic();
    } else {
      setFreshness(null);
      setSchemaJson(null);
      setSemanticJson(null);
      setSuggestedSemantic(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!question.trim()) return;

  setIsLoading(true);
  setError(null);
  setSqlQuery(null);
  setResults(null);

  try {
    const data = await fetchQueryResult(question);

    if (!data.success) {
      setError(data.error || "Something went wrong.");
    } else {
      const response = data.response;

      if (response.type === "query_result") {
        setSqlQuery({ query: response.sql, explanation: "Here is the generated SQL query." });
        setResults({ columns: response.columns, rows: response.rows });
      } else if (response.type === "error") {
        setError(response.error);
      }
    }
  } catch (err) {
    console.error(err);
    setError("Failed to connect to backend or parse response.");
  } finally {
    setIsLoading(false);
  }
};


  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const fetchFreshness = async () => {
    try {
      const res = await fetch('http://localhost:8000/freshness', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setFreshness(data.freshness || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSchema = async () => {
    try {
      const res = await fetch('http://localhost:8000/schema', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      setSchemaJson(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSemantic = async () => {
    try {
      const res = await fetch('http://localhost:8000/semantic', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      setSemanticJson(data);
    } catch (e) {
      console.error(e);
    }
  };

  const suggestSemantic = async () => {
    if (!schemaJson) return;
    try {
      const res = await fetch('http://localhost:8000/semantic/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(schemaJson)
      });
      const data = await res.json();
      setSuggestedSemantic(data.suggested);
    } catch (e) {
      console.error(e);
    }
  };

  const saveSemantic = async () => {
    if (!suggestedSemantic) return;
    try {
      const res = await fetch('http://localhost:8000/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ semantic_layer: suggestedSemantic })
      });
      const data = await res.json();
      if (data.success) {
        setSemanticJson(suggestedSemantic);
        // Also persist to disk via backend
        await fetch('http://localhost:8000/semantic/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SQL Copilot
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>
              {token && (
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auth Section */}
        {!token && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300 max-w-md mx-auto">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {authMode === 'login' ? 'Login' : 'Register'} to continue
                </h2>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={isLoading || !username || !password}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Please wait…' : authMode === 'login' ? 'Login' : 'Register'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {authMode === 'login' ? 'Create an account' : 'Have an account? Login'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Data Freshness & Semantic Setup */}
        {token && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Freshness */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <RefreshCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data Freshness</h2>
                </div>
                <button onClick={fetchFreshness} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Refresh</button>
              </div>
              <div className="space-y-2 max-h-56 overflow-auto text-sm">
                {freshness?.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="text-gray-800 dark:text-gray-200 font-medium">{f.table}</div>
                    <div className="text-gray-500 dark:text-gray-400">{f.timestamp_column || 'N/A'}</div>
                    <div className="text-gray-700 dark:text-gray-300">{f.last_loaded || 'Unknown'}</div>
                  </div>
                )) || <div className="text-gray-500 dark:text-gray-400">No data yet</div>}
              </div>
            </div>

            {/* Semantic Setup */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Semantic Layer</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadSchema} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Load Schema</button>
                  <button onClick={suggestSemantic} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Suggest</button>
                  <button onClick={saveSemantic} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Schema</div>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-auto max-h-48">{JSON.stringify(schemaJson, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggested Semantic Layer (editable)</div>
                  <textarea
                    className="w-full h-48 text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 text-gray-800 dark:text-gray-200"
                    value={JSON.stringify(suggestedSemantic ?? semanticJson ?? {}, null, 2)}
                    onChange={(e) => {
                      try { setSuggestedSemantic(JSON.parse(e.target.value)); } catch {}
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        {token && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ask your data question
                </h2>
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me anything about your data..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none h-24 transition-colors duration-200"
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message & SQL Query */}
        {token && sqlQuery && sqlQuery.query && (
          <div className="mb-8 space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-300">{sqlQuery.explanation}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Generated SQL Query
                  </h3>
                </div>
              </div>
              <div className="p-4">
                <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
                  <code>{sqlQuery.query}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {token && results && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Table className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Query Results
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {results.columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300"
                        >
                          {typeof cell === 'number' && cell % 1 !== 0 
                            ? cell.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : cell.toLocaleString()
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {token && !sqlQuery && !error && !isLoading && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Database className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ready to analyze your data
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Ask questions about your data in natural language. I'll convert them into SQL queries and show you the results.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              © 2024 SQL Copilot. Built with AI assistance.
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
