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
  Sparkles
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

  // Mock data for demonstration
  const mockQueries = {
    'total revenue by month': {
      query: `SELECT 
  DATE_TRUNC('month', order_date) as month,
  SUM(total_amount) as total_revenue
FROM orders 
WHERE order_date >= '2024-01-01'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month DESC;`,
      explanation: 'This query calculates total revenue grouped by month from the orders table.',
      results: {
        columns: ['month', 'total_revenue'],
        rows: [
          ['2024-03-01', 45230.50],
          ['2024-02-01', 38940.75],
          ['2024-01-01', 42180.25]
        ]
      }
    },
    'top customers': {
      query: `SELECT 
  c.customer_name,
  COUNT(o.order_id) as total_orders,
  SUM(o.total_amount) as total_spent
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name
ORDER BY total_spent DESC
LIMIT 10;`,
      explanation: 'This query finds the top 10 customers by total spending.',
      results: {
        columns: ['customer_name', 'total_orders', 'total_spent'],
        rows: [
          ['Alice Johnson', 12, 2840.50],
          ['Bob Smith', 8, 1950.75],
          ['Carol Davis', 15, 1820.25],
          ['David Wilson', 6, 1675.00],
          ['Emma Brown', 9, 1540.80]
        ]
      }
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setSqlQuery(null);
    setResults(null);

    // Simulate API call
    setTimeout(() => {
      const questionLower = question.toLowerCase();
      
      if (questionLower.includes('revenue') || questionLower.includes('sales')) {
        const mockData = mockQueries['total revenue by month'];
        setSqlQuery({ query: mockData.query, explanation: mockData.explanation });
        setResults(mockData.results);
      } else if (questionLower.includes('customer') || questionLower.includes('top')) {
        const mockData = mockQueries['top customers'];
        setSqlQuery({ query: mockData.query, explanation: mockData.explanation });
        setResults(mockData.results);
      } else {
        setError('I\'m not sure how to answer that question. Try asking about revenue, sales, or customers.');
      }
      
      setIsLoading(false);
    }, 1500);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
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
        {sqlQuery && (
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
        {results && (
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
        {!sqlQuery && !error && !isLoading && (
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
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setQuestion('What\'s the total revenue by month?')}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200"
              >
                Total revenue by month
              </button>
              <button
                onClick={() => setQuestion('Show me the top customers')}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200"
              >
                Top customers
              </button>
            </div>
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