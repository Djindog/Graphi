import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Tooltip } from '../Tooltip';
import { generateSummaryText, generateNodeSummary, updateNodeSummary } from '../../lib/summaryManagement';
import { useDagStore } from '../../stores/dagStore';
import type { Node, Message } from '../../types';
import type Groq from 'groq-sdk';

interface Props {
  node: Node | null;
  messages: Message[];
  groqClient: InstanceType<typeof Groq> | null;
}

export function NodeTopics({ node, messages, groqClient }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [topics, setTopics] = useState<string | null>(null);

  if (!node) return null;

  // On mount or when summary text changes, regenerate topics from the summary
  useEffect(() => {
    if (!node.summary || !groqClient) return;
    generateNodeSummary(node.summary, groqClient, node.title)
      .then(newTopics => {
        if (newTopics) setTopics(newTopics);
      })
      .catch(err => console.error('Failed to generate topics on load:', err));
  }, [node.id, node.summary, groqClient, node.title]);

  const handleRefresh = async () => {
    if (!groqClient || messages.length === 0) return;
    setIsRefreshing(true);
    try {
      const summaryText = await generateSummaryText(messages, groqClient);
      if (summaryText) {
        await updateNodeSummary(node.id, summaryText);
        useDagStore.setState(s => ({
          nodes: s.nodes.map(n => n.id === node.id ? { ...n, summary: summaryText } : n),
        }));
        const newTopics = await generateNodeSummary(summaryText, groqClient, node?.title);
        if (newTopics) setTopics(newTopics);
      }
    } catch (err) {
      console.error('Failed to refresh topics:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Node Topics
        </p>
        <Tooltip placement="top" width={120} content={isRefreshing ? 'Refreshing...' : 'Refresh topics'}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || !groqClient || messages.length === 0}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, padding: 0, border: 'none', background: 'transparent',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              opacity: isRefreshing || !groqClient ? 0.4 : 0.6,
              color: '#6B7280', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { if (!isRefreshing && groqClient) (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'; }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </Tooltip>
      </div>
      {topics && (
        <p style={{ fontSize: 13, color: '#374151', margin: '8px 0 0', lineHeight: 1.5 }}>
          {topics}
        </p>
      )}
      {!topics && (
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '8px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
          No topics yet
        </p>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
