// L'ancienne page Consommation est devenue un onglet de Statistiques : l'adresse continue de marcher.
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/admin/stats?tab=consommation');
}
