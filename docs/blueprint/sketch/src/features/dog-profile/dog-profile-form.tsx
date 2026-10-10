/**
 * The Dog Profile form (with the Owner's name on top), used by BOTH onboarding and the
 * Profile tab.
 *
 * Usage:
 *   <DogProfileForm submitLabel="はじめる" />                                  // onboarding
 *   <DogProfileForm initial={session.owner} submitLabel="保存" />              // Profile tab
 *
 * Saving calls `api.owners.save` (an upsert). After onboarding nothing navigates:
 * the session flips to `ready` and `Stack.Protected` shows the tabs.
 */
import type { BirthMonth, Breed, Owner } from '@/convex/domain/dogProfile';

export function DogProfileForm(props: {
  initial?: Owner;
  submitLabel: string;
}): React.ReactElement {
  void props;
  // TODO: draft = initial ? draftFromOwner(initial) : emptyDogProfileDraft(new Date());
  //       fields: TextInput ×2, <BreedField>, <BirthMonthField>, sex segmented choice,
  //       weight (decimal-pad), Dog Memo (multiline);
  //       submit → parseDogProfileDraft → useMutation(api.owners.save)({ owner }).
  throw new Error('not implemented');
}

/**
 * Tap → modal with a search box (`searchBreeds`) and a list. Choosing "その他" reveals a
 * free-text input. A component, not a route: the value stays in the form's draft.
 */
export function BreedField(props: {
  value: Breed | null;
  onChange: (breed: Breed) => void;
  error?: string;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}

/**
 * Two `@expo/ui` Pickers (year, month) + a Switch 「推定」. Years from
 * DOG_PROFILE_LIMITS.earliestBirthYear to this year; future months disabled.
 */
export function BirthMonthField(props: {
  value: BirthMonth;
  onChange: (value: BirthMonth) => void;
  error?: string;
}): React.ReactElement {
  void props;
  throw new Error('not implemented');
}
