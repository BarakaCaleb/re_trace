import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export type Role = "customs" | "garage" | "dealer" | "recycler" | "oem";

export type UserProfile = {
  fullName?: string;
  orgName?: string;
  role?: Role;
  email?: string;
  phoneE164?: string;
  countryCode?: string;
  region?: string;
  proPoints?: number;
};

export function routeForRole(role?: Role) {
  if (role === "oem") return "/oem";
  if (role === "customs") return "/customs";
  if (role === "garage") return "/garage";
  if (role === "dealer") return "/dealer";
  if (role === "recycler") return "/recycler";
  return "/login";
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDoc(doc(db, "users", u.uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}