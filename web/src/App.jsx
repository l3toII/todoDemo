import React from 'react'

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>GTD Todo App</h1>
      <p>Infrastructure Test - Web Client</p>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Version: 0.1.0 | Environment: {import.meta.env.MODE}
      </p>
    </div>
  )
}

export default App
