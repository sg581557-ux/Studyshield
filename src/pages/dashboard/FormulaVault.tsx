import { FormulaVault as FormulaVaultComponent } from '../../components/FormulaVault/FormulaVault';
import { FormulaVaultProvider } from '../../context/FormulaVaultContext';

export default function FormulaVault() {
  return (
    <FormulaVaultProvider>
      <FormulaVaultComponent />
    </FormulaVaultProvider>
  );
}