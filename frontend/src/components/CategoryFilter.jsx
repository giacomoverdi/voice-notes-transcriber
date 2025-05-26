import React from 'react';
import { Tag } from 'lucide-react';

function CategoryFilter({ categories, selected, onToggle }) {
  const categoryIcons = {
    meeting: '👥',
    idea: '💡',
    todo: '✅',
    personal: '👤',
    work: '💼',
    learning: '📚',
    finance: '💰',
    health: '🏃'
  };

  const categoryColors = {
    meeting: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    idea: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    todo: 'bg-red-100 text-red-700 hover:bg-red-200',
    personal: 'bg-green-100 text-green-700 hover:bg-green-200',
    work: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    learning: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    finance: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    health: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
  };

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onToggle(category)}
          className={`
            w-full text-left px-3 py-2 rounded-lg transition-colors
            flex items-center gap-2 text-sm
            ${selected.includes(category) 
              ? categoryColors[category] || 'bg-gray-200 text-gray-700'
              : 'hover:bg-gray-100'
            }
          `}
        >
          <span className="text-base">{categoryIcons[category] || '📌'}</span>
          <span className="capitalize">{category}</span>
          {selected.includes(category) && (
            <Tag size={14} className="ml-auto" />
          )}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;