import { useSyncExternalStore } from 'react';
import { NetworkContact } from '@/types/network';
import { initialNetworkContacts } from '@/data/initialNetwork';
import { normalizeCompanyName } from './networkParser';

export const NETWORK_STORAGE_KEY = 'ccc_network_v1';

export function normalizeNetworkContact(raw: unknown): NetworkContact {
  const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const nameCandidate =
    (typeof item.fullName === 'string' && item.fullName.trim()) ||
    (typeof item.name === 'string' && item.name.trim()) ||
    [typeof item.firstName === 'string' && item.firstName.trim(), typeof item.lastName === 'string' && item.lastName.trim()]
      .filter(Boolean)
      .join(' ') ||
    'Professional Contact';

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    fullName: nameCandidate,
    firstName: typeof item.firstName === 'string' ? item.firstName.trim() : undefined,
    lastName: typeof item.lastName === 'string' ? item.lastName.trim() : undefined,
    email: typeof item.email === 'string' ? item.email.trim() : undefined,
    company: (typeof item.company === 'string' ? item.company.trim() : undefined) || '',
    position: (typeof item.position === 'string' ? item.position.trim() : typeof item.title === 'string' ? item.title.trim() : undefined),
    linkedInUrl: (typeof item.linkedInUrl === 'string' ? item.linkedInUrl.trim() : typeof item.linkedin_url === 'string' ? item.linkedin_url.trim() : undefined),
    connectedOn: (typeof item.connectedOn === 'string' ? item.connectedOn.trim() : typeof item.connectionDate === 'string' ? item.connectionDate.trim() : typeof item.connection_date === 'string' ? item.connection_date.trim() : undefined),
    source: (item.source as NetworkContact['source']) || 'generic_csv',
    importedAt: typeof item.importedAt === 'string' ? item.importedAt : typeof item.created_at === 'string' ? item.created_at : new Date().toISOString(),
    notes: typeof item.notes === 'string' ? item.notes : undefined,
  };
}

const FROZEN_INITIAL_CONTACTS: NetworkContact[] = Object.freeze(
  initialNetworkContacts.map(normalizeNetworkContact)
) as unknown as NetworkContact[];

export function getInitialNetworkServerSnapshot(): NetworkContact[] {
  return FROZEN_INITIAL_CONTACTS;
}

let cachedContacts: NetworkContact[] | null = null;
let inMemoryContacts: NetworkContact[] = FROZEN_INITIAL_CONTACTS;

export function getNetworkContacts(): NetworkContact[] {
  if (typeof window === 'undefined') return inMemoryContacts;

  if (cachedContacts !== null) {
    return cachedContacts;
  }

  try {
    const raw = window.localStorage.getItem(NETWORK_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(FROZEN_INITIAL_CONTACTS));
      cachedContacts = FROZEN_INITIAL_CONTACTS;
      inMemoryContacts = FROZEN_INITIAL_CONTACTS;
      return cachedContacts;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedContacts = FROZEN_INITIAL_CONTACTS;
      inMemoryContacts = FROZEN_INITIAL_CONTACTS;
      return cachedContacts;
    }
    const normalized = Object.freeze(parsed.map(normalizeNetworkContact)) as NetworkContact[];
    cachedContacts = normalized;
    inMemoryContacts = normalized;
    return cachedContacts;
  } catch {
    return inMemoryContacts;
  }
}

export function saveNetworkContacts(contacts: NetworkContact[]): void {
  const normalized = contacts.map(normalizeNetworkContact);
  cachedContacts = Object.freeze(normalized) as NetworkContact[];
  inMemoryContacts = cachedContacts;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new Event('ccc_network_updated'));
    } catch (err) {
      console.error('[networkStorage] Failed to save contacts:', err);
    }
  }
}

export function addNetworkContacts(newContacts: NetworkContact[]): NetworkContact[] {
  const allContacts = getNetworkContacts().map((c) => ({ ...c }));
  const seenUrls = new Map<string, number>();
  const seenEmails = new Map<string, number>();
  const seenNames = new Map<string, number>();
  const seenIds = new Set<string>();

  const rebuildIndices = () => {
    seenUrls.clear();
    seenEmails.clear();
    seenNames.clear();
    allContacts.forEach((c, idx) => {
      seenIds.add(c.id);
      if (c.linkedInUrl) {
        seenUrls.set(c.linkedInUrl.toLowerCase().replace(/\/$/, ''), idx);
      }
      if (c.email) {
        seenEmails.set(c.email.toLowerCase(), idx);
      }
      if (c.fullName && c.company) {
        seenNames.set(`${c.fullName.toLowerCase()}_${normalizeCompanyName(c.company)}`, idx);
      }
    });
  };

  rebuildIndices();

  for (const c of newContacts) {
    if (seenIds.has(c.id)) continue;

    const urlKey = c.linkedInUrl ? c.linkedInUrl.toLowerCase().replace(/\/$/, '') : '';
    const emailKey = c.email ? c.email.toLowerCase() : '';
    const nameKey = c.fullName && c.company ? `${c.fullName.toLowerCase()}_${normalizeCompanyName(c.company)}` : '';

    let matchIdx: number | undefined = undefined;
    if (urlKey && seenUrls.has(urlKey)) {
      matchIdx = seenUrls.get(urlKey);
    } else if (emailKey && seenEmails.has(emailKey)) {
      matchIdx = seenEmails.get(emailKey);
    } else if (nameKey && seenNames.has(nameKey)) {
      matchIdx = seenNames.get(nameKey);
    }

    if (matchIdx !== undefined && matchIdx >= 0 && matchIdx < allContacts.length) {
      // Merge richer fields into existing
      const existingContact = allContacts[matchIdx];
      if (c.position && (!existingContact.position || c.position.length > existingContact.position.length)) {
        existingContact.position = c.position;
      }
      if (c.company && (!existingContact.company || c.company.length > existingContact.company.length)) {
        existingContact.company = c.company;
      }
      if (c.email && !existingContact.email) {
        existingContact.email = c.email;
      }
      if (c.linkedInUrl && !existingContact.linkedInUrl) {
        existingContact.linkedInUrl = c.linkedInUrl;
      }
      if (c.connectedOn && !existingContact.connectedOn) {
        existingContact.connectedOn = c.connectedOn;
      }
    } else {
      allContacts.unshift(c);
      rebuildIndices();
    }
  }

  saveNetworkContacts(allContacts);
  return allContacts;
}

export function updateNetworkContact(id: string, updates: Partial<NetworkContact>): NetworkContact[] {
  const contacts = getNetworkContacts();
  const updated = contacts.map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveNetworkContacts(updated);
  return updated;
}

export function deleteNetworkContact(id: string): NetworkContact[] {
  const contacts = getNetworkContacts();
  const filtered = contacts.filter((c) => c.id !== id);
  saveNetworkContacts(filtered);
  return filtered;
}

export function resetNetworkDemoData(): NetworkContact[] {
  saveNetworkContacts(FROZEN_INITIAL_CONTACTS);
  return FROZEN_INITIAL_CONTACTS;
}

export function clearNetworkContacts(): void {
  saveNetworkContacts([]);
}

function subscribeNetwork(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    cachedContacts = null;
    callback();
  };

  window.addEventListener('ccc_network_updated', handleUpdate);
  window.addEventListener('storage', handleUpdate);
  return () => {
    window.removeEventListener('ccc_network_updated', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
  };
}

const emptySubscribe = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export function useNetwork(): {
  contacts: NetworkContact[];
  mounted: boolean;
  addContacts: (contacts: NetworkContact[]) => void;
  updateContact: (id: string, updates: Partial<NetworkContact>) => void;
  deleteContact: (id: string) => void;
  resetDemoData: () => void;
  clearContacts: () => void;
} {
  const contacts = useSyncExternalStore(
    subscribeNetwork,
    getNetworkContacts,
    getInitialNetworkServerSnapshot
  );
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientMounted,
    getServerMounted
  );

  return {
    contacts,
    mounted,
    addContacts: (newOnes) => {
      addNetworkContacts(newOnes);
    },
    updateContact: (id, updates) => {
      updateNetworkContact(id, updates);
    },
    deleteContact: (id) => {
      deleteNetworkContact(id);
    },
    resetDemoData: () => {
      resetNetworkDemoData();
    },
    clearContacts: () => {
      clearNetworkContacts();
    },
  };
}
