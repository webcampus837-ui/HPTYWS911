export type BirthdayStatus = 'active' | 'inactive';

export interface Birthday {
  id: string;
  name: string;
  slug: string;
  /** ISO date string, e.g. 2005-08-15 */
  date_of_birth: string;
  theme_id: string;
  preset_message_id: string | null;
  custom_message: string | null;
  status: BirthdayStatus;
  created_at: string;
  updated_at: string;
}

export interface BirthdayPhoto {
  id: string;
  birthday_id: string;
  storage_path: string;
  public_url: string;
  display_order: number;
  created_at: string;
}

export interface BirthdayListItem extends Birthday {
  photo_count: number;
}

export interface BirthdayWithPhotos extends Birthday {
  photos: BirthdayPhoto[];
}

export type BirthdayInput = {
  name: string;
  slug: string;
  date_of_birth: string;
  theme_id: string;
  preset_message_id: string | null;
  custom_message: string | null;
  status: BirthdayStatus;
};

/** Data used by the public birthday experience once unlocked (or in admin preview). */
export interface ExperiencePhoto {
  url: string;
  alt: string;
}

export interface ExperienceData {
  name: string;
  themeId: string;
  message: string;
  photos: ExperiencePhoto[];
}

/** Result of the public teaser RPC — deliberately minimal. */
export type TeaserResult =
  | { status: 'active'; first_name: string; theme_id: string }
  | { status: 'inactive' | 'not_found' };

/** Result of the public unlock RPC. */
export type UnlockResult =
  | {
      status: 'unlocked';
      name: string;
      theme_id: string;
      preset_message_id: string | null;
      custom_message: string | null;
      photos: { url: string; order: number }[];
    }
  | { status: 'invalid' | 'inactive' | 'not_found' | 'rate_limited' };

/** Passed through router state when a new birthday redirects to the dashboard. */
export interface CreatedBirthdayNavState {
  name: string;
  slug: string;
  status: BirthdayStatus;
  photosUploaded: number;
  photosFailed: number;
}
