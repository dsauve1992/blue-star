import { useState } from 'react';
import { useOpenPosition } from '../hooks/use-positions';
import { Card } from '../../global/design-system/card';
import { Button } from '../../global/design-system/button';
import { Input } from '../../global/design-system/input';
import { Label } from '../../global/design-system/label';
import { Alert } from '../../global/design-system/alert';
import { Plus } from 'lucide-react';

export function OpenPositionForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    portfolioId: '',
    instrument: '',
    quantity: '',
    price: '',
    note: '',
  });

  const openPositionMutation = useOpenPosition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.portfolioId || !formData.instrument || !formData.quantity || !formData.price) {
      return;
    }

    try {
      await openPositionMutation.mutateAsync({
        portfolioId: formData.portfolioId,
        instrument: formData.instrument,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        timestamp: new Date().toISOString(),
        note: formData.note || undefined,
      });
      
      setFormData({
        portfolioId: '',
        instrument: '',
        quantity: '',
        price: '',
        note: '',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to open position:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Open New Position
      </Button>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Open New Position
      </h3>
      
      {openPositionMutation.error && (
        <Alert variant="destructive" className="mb-4">
          Failed to open position. Please try again.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="portfolioId">Portfolio ID</Label>
            <Input
              id="portfolioId"
              type="text"
              value={formData.portfolioId}
              onChange={(e) => handleInputChange('portfolioId', e.target.value)}
              placeholder="e.g., portfolio-123"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="instrument">Instrument (Ticker)</Label>
            <Input
              id="instrument"
              type="text"
              value={formData.instrument}
              onChange={(e) => handleInputChange('instrument', e.target.value)}
              placeholder="e.g., AAPL"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              placeholder="e.g., 100"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="e.g., 150.50"
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="note">Note (Optional)</Label>
          <Input
            id="note"
            type="text"
            value={formData.note}
            onChange={(e) => handleInputChange('note', e.target.value)}
            placeholder="Add a note about this position"
          />
        </div>
        
        <div className="flex space-x-2">
          <Button
            type="submit"
            disabled={openPositionMutation.isPending}
            className="flex-1"
          >
            {openPositionMutation.isPending ? 'Opening...' : 'Open Position'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={openPositionMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
