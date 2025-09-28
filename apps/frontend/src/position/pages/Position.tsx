import { PositionList } from '../components/PositionList';
import { OpenPositionForm } from '../components/OpenPositionForm';

export default function Position() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          Position Management
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Manage your trading positions and portfolio
        </p>
      </div>

      <OpenPositionForm />
      
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Your Positions
        </h2>
        <PositionList />
      </div>
    </div>
  );
}
