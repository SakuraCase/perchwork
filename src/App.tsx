function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Tracelight</h1>
        <p className="text-gray-400 mb-8">Code Structure Visualizer</p>
        <div className="bg-gray-800 rounded-lg p-6 max-w-md">
          <p className="text-yellow-400 mb-4">データがありません</p>
          <p className="text-sm text-gray-500">
            Claude Code で <code className="bg-gray-700 px-2 py-1 rounded">/tracelight</code> を実行して
            コードベースを解析してください。
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
