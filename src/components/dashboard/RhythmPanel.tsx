import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import type { RhythmType } from '../../engine/types';

interface RhythmPanelProps {
  rhythm: RhythmType;
}

export function RhythmPanel({ rhythm }: RhythmPanelProps) {
  const { t } = useTranslation();

  switch (rhythm) {
    case 'vf_pvt':
      return <Badge variant="red">{t('rhythm.vf_pvt')}</Badge>;
    case 'asystole_pea':
      return <Badge variant="blue">{t('rhythm.asystole_pea')}</Badge>;
    case 'organized':
      return <Badge variant="green">{t('rhythm.organized')}</Badge>;
    default:
      return <Badge variant="slate">—</Badge>;
  }
}
