'use client';

import { useState, useEffect, useActionState, startTransition } from 'react';
import { sampleAgent } from './actions';
import { agentName, bedrockModel, agentInstructions } from '../../parameter';

export function ChatInterface() {
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<{ text: string; toolCalls?: string[] }[]>([]);
  const [maxSteps, setMaxSteps] = useState(5);
  const [showInstructions, setShowInstructions] = useState(false);

  const [state, action, isPending] = useActionState(
    async (prevState: { steps: { text: string }[] } | null, formData: FormData) => {
      return await sampleAgent(formData);
    },
    null
  );

  useEffect(() => {
    if (state?.steps) {
      setResults(state.steps);
    }
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setResults([]);
    const formData = new FormData();
    formData.set("message", JSON.stringify(message));
    formData.set("maxSteps", maxSteps.toString());
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{agentName}</h1>
      <p className="text-sm text-gray-500 mb-4">Model ID: {bedrockModel}</p>
      <button
        className={
          "mb-2 px-3 py-1 text-sm rounded transition-colors " +
          (showInstructions
            ? "bg-purple-500 text-white hover:bg-purple-600"
            : "bg-orange-200 text-orange-900 hover:bg-orange-300")
        }
        type="button"
        onClick={() => setShowInstructions((prev) => !prev)}
      >
        {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
      </button>
      {showInstructions && (
        <div className="mb-4 p-3 bg-gray-50 border rounded whitespace-pre-wrap text-sm text-gray-800">
          {agentInstructions}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-2">
            Max Steps
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={maxSteps}
            onChange={(e) => setMaxSteps(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-24 px-3 py-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            disabled={isPending}
          />
        </div>
        <label className="block text-sm font-medium text-gray-500 mb-2">
          Prompt
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          className="w-full p-2 border rounded"
          disabled={isPending}
        />
        <button
          type="submit"
          className={
            "mt-2 px-4 py-2 text-white rounded " +
            (isPending
              ? "bg-green-500 hover:bg-green-600"
              : "bg-blue-500 hover:bg-blue-600")
          }
          disabled={isPending}
        >
          {isPending ? 'Waiting...' : 'Send'}
        </button>
      </form>
      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="p-4 bg-gray-100 rounded">
            <p className="whitespace-pre-wrap text-gray-800">{result.text}</p>
            {result.toolCalls && result.toolCalls.length > 0 && (
              <ul className="mt-2 text-xs text-purple-700">
                {result.toolCalls.map((tool: string, i: number) => (
                  <li key={i}>tool: {tool}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
