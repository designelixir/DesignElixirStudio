'use client';

import { useState, FormEvent } from 'react';
import { ExpenseCategory } from '@/types/globalTypes';
import {
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
} from '@/app/actions/expenseCategoryActions';
import ColorSelector, { getRandomColor } from '@/app/components/ColorSelector';

interface CategoryFormProps {
  category?: ExpenseCategory; // pass to edit; leave out to add a new one
  initialTitle?: string;      // pre-fills the title when adding
  onSaved: (category: ExpenseCategory) => void;
  onClose: () => void;
}

// Popup for adding or editing an expense category
export default function CategoryForm({ category, initialTitle, onSaved, onClose }: CategoryFormProps) {
  const isEditing = !!category;
  const [formData, setFormData] = useState(() => ({
    title: category?.title ?? initialTitle ?? '',
    description: category?.description ?? '',
    percent_writeoff: category ? String(category.percent_writeoff) : '100',
    color: category?.color ?? getRandomColor(),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const input = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      percent_writeoff: Number(formData.percent_writeoff),
      color: formData.color,
    };

    try {
      const saved = category
        ? await updateExpenseCategoryAction(category.id, input)
        : await createExpenseCategoryAction(input);
      onSaved(saved);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err instanceof Error ? err.message : 'Failed to save category');
      setSaving(false);
    }
  };

  return (
    <div className='module-popup-container flex-center-center' onClick={onClose}>
      <div className='module-popup basic-padding br' onClick={(e) => e.stopPropagation()}>
        <div className='flex-center-spacebetween module-popup-header'>
          <h2>{isEditing ? 'Edit Category' : 'Add Category'}</h2>
          <button type='button' onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='flex-start-start'>
            <div className='flex-start-start flex-column form-input-wrapper' style={{ flex: 'none' }}>
              <label>Color</label>
              <div style={{ padding: '8px 0' }}>
                <ColorSelector
                  selectedColor={formData.color}
                  onColorChange={(color) => setFormData({ ...formData, color })}
                />
              </div>
            </div>
            <div className='flex-start-start flex-column form-input-wrapper'>
              <label>Title *</label>
              <input
                type='text'
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder='e.g., Software'
              />
            </div>
            <div className='flex-start-start flex-column form-input-wrapper' style={{ maxWidth: '140px' }}>
              <label>Write-off (%) *</label>
              <input
                type='number'
                required
                min='0'
                max='100'
                step='0.01'
                value={formData.percent_writeoff}
                onChange={(e) => setFormData({ ...formData, percent_writeoff: e.target.value })}
              />
            </div>
          </div>

          <div className='flex-start-start flex-column form-input-wrapper'>
            <label>Description</label>
            <textarea
              rows={3}
              className='full-width'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='What goes in this category?'
            />
          </div>

          {error && <div style={{ color: 'red', margin: '10px' }}>{error}</div>}

          <button type='submit' disabled={saving} style={{ margin: '10px' }}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Category'}
          </button>
        </form>
      </div>
    </div>
  );
}
