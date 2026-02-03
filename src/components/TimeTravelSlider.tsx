import React, { useState, useEffect } from 'react';
import { apiClient, Commit } from '../api/client';
import { Node, Edge } from '@xyflow/react';
import { CortexNodeData } from './nodes/CortexNode';

interface TimeTravelSliderProps {
    onPreviewState: (nodes: Node<CortexNodeData>[], edges: Edge[]) => void;
    onRestore: (commitId: string) => void;
    currentMode: 'live' | 'preview';
    onExitPreview: () => void;
}

export const TimeTravelSlider: React.FC<TimeTravelSliderProps> = ({ 
    onPreviewState, 
    onRestore, 
    currentMode,
    onExitPreview 
}) => {
    const [commits, setCommits] = useState<Commit[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiClient.getCommits().then(data => {
            // API returns New -> Old (DESC).
            // We reverse it so index 0 is Oldest, last index is Newest.
            const sorted = [...data].reverse();
            setCommits(sorted);
            // Default to newest
            setSelectedIndex(sorted.length > 0 ? sorted.length - 1 : 0);
        });
    }, []);

    const handleSliderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value);
        setSelectedIndex(index);
        
        const commit = commits[index];
        if (!commit) return;

        setLoading(true);
        const snapshot = await apiClient.getCommitSnapshot(commit.id);
        setLoading(false);
        
        if (snapshot) {
            onPreviewState(snapshot.nodes, snapshot.edges);
        }
    };

    const handleRestoreClick = () => {
        const commit = commits[selectedIndex];
        if (commit) {
            onRestore(commit.id);
        }
    };

    if (commits.length === 0) return null;

    const selectedCommit = commits[selectedIndex];
    if (!selectedCommit) return null;

    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur shadow-xl rounded-lg p-4 w-96 z-50 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Time Travel</span>
                {currentMode === 'preview' && (
                    <button 
                        onClick={onExitPreview}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Return to Live
                    </button>
                )}
            </div>
            
            <input 
                type="range" 
                min="0" 
                max={commits.length - 1} 
                value={selectedIndex} 
                onChange={handleSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            
            <div className="mt-2 text-center">
                <div className="text-sm font-medium truncate">
                    {selectedCommit.message || 'No Message'}
                </div>
                <div className="text-xs text-gray-400">
                    {new Date(selectedCommit.timestamp).toLocaleString()}
                </div>
            </div>

            {currentMode === 'preview' && (
                <button 
                    onClick={handleRestoreClick}
                    disabled={loading}
                    className="mt-3 w-full py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                >
                    Restore this Version
                </button>
            )}
        </div>
    );
};
