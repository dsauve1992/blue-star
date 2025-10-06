import { useState } from 'react';
import { Button, Card, Input, Label, DateInput } from 'src/global/design-system';
import { useSellShares } from '../hooks/use-positions';

interface SellSharesModalProps {
  positionId: string;
  instrument: string;
  currentQuantity: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SellSharesModal({
  positionId,
  instrument,
  currentQuantity,
  isOpen,
  onClose,
}: SellSharesModalProps) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sellSharesMutation = useSellShares();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    } else if (Number(quantity) > currentQuantity) {
      newErrors.quantity = `Cannot sell more than ${currentQuantity} shares`;
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      newErrors.price = 'Price must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await sellSharesMutation.mutateAsync({
        positionId,
        request: {
          quantity: Number(quantity),
          price: Number(price),
          timestamp: new Date(date).toISOString(),
          note: note || undefined,
        },
      });

      // Reset form and close modal
      setQuantity('');
      setPrice('');
      setNote('');
      setDate(new Date().toISOString().split("T")[0]);
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Failed to sell shares:', error);
    }
  };

  const handleClose = () => {
    setQuantity('');
    setPrice('');
    setNote('');
    setDate(new Date().toISOString().split("T")[0]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Sell {instrument} Shares
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ×
          </Button>
        </div>

        <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Current position: <span className="font-medium">{currentQuantity} shares</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantity to Sell</Label>
            <Input
              id="quantity"
              type="number"
              max={currentQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Max: ${currentQuantity} shares`}
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.quantity}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="price">Price per Share</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price per share"
              className={errors.price ? 'border-red-500' : ''}
            />
            {errors.price && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.price}
              </p>
            )}
          </div>

          <div>
            <DateInput
              label="Transaction Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              helperText="Select the date when this transaction occurred"
            />
          </div>

          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={sellSharesMutation.isPending}
              className="flex-1"
            >
              {sellSharesMutation.isPending ? 'Selling...' : 'Sell Shares'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
