import type { BirthMonth, Breed, Owner } from '@/convex/domain/dogProfile';

export function DogProfileForm(props: {
  initial?: Owner;
  submitLabel: string;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

export function BreedField(props: {
  value: Breed | null;
  onChange: (breed: Breed) => void;
  error?: string;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

export function BirthMonthField(props: {
  value: BirthMonth;
  onChange: (value: BirthMonth) => void;
  error?: string;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}
