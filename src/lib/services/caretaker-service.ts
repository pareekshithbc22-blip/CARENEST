import { prisma } from "@/lib/prisma";
import {
  formatCaretakerAvailability,
  MAX_CARETAKER_PATIENTS,
  canCaretakerAcceptPatient,
} from "@/lib/domain/caretaker-capacity";
import { isCaretakerDeclined } from "@/lib/domain/requests";

export interface VerifiedCaretakerCard {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  professionalCategory: string;
  qualification: string;
  specialization: string | null;
  yearsOfExperience: number | null;
  backgroundSummary: string | null;
  registrationNumber: string | null;
  issuingAuthority: string;
  patientCount: number;
  maxPatients: number;
  availableSlots: number;
  isFull: boolean;
  availabilityLabel: string;
  isDeclined: boolean;
  canAccept: boolean;
}

export async function listVerifiedCaretakers(
  forPatientDeclinedIds: string[] = []
): Promise<VerifiedCaretakerCard[]> {
  // Query all caretakers with approved professional verification
  const caretakerProfiles = await prisma.caretakerProfile.findMany({
    where: {
      status: { in: ["APPROVED", "AUTO_APPROVED"] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const cards: VerifiedCaretakerCard[] = await Promise.all(
    caretakerProfiles.map(async (cp) => {
      // Derive patient count strictly from ACCEPTED assignments
      const acceptedCount = await prisma.patientAccessRequest.count({
        where: {
          caretakerId: cp.userId,
          status: "APPROVED",
        },
      });

      const availability = formatCaretakerAvailability(acceptedCount);
      const declined = isCaretakerDeclined(forPatientDeclinedIds, cp.userId);
      const canAccept = canCaretakerAcceptPatient(acceptedCount) && !declined;

      return {
        id: cp.id,
        userId: cp.userId,
        name: cp.fullName || cp.user.name,
        email: cp.user.email,
        phoneNumber: cp.user.phoneNumber,
        avatarUrl: cp.user.avatarUrl,
        professionalCategory: cp.professionalCategory,
        qualification: cp.qualification,
        specialization: cp.specialization,
        yearsOfExperience: cp.yearsOfExperience,
        backgroundSummary: cp.backgroundSummary,
        registrationNumber: cp.registrationNumber,
        issuingAuthority: cp.issuingAuthority,
        patientCount: availability.count,
        maxPatients: MAX_CARETAKER_PATIENTS,
        availableSlots: availability.availableSlots,
        isFull: availability.isFull,
        availabilityLabel: availability.availabilityLabel,
        isDeclined: declined,
        canAccept,
      };
    })
  );

  // Free and available first, full caretakers after, declined last
  cards.sort((a, b) => {
    if (a.isDeclined && !b.isDeclined) return 1;
    if (!a.isDeclined && b.isDeclined) return -1;
    if (!a.isFull && b.isFull) return -1;
    if (a.isFull && !b.isFull) return 1;
    return a.patientCount - b.patientCount;
  });

  return cards;
}

export async function updateCaretakerProfessionalProfile(
  userId: string,
  data: {
    specialization?: string | null;
    yearsOfExperience?: number | null;
    backgroundSummary?: string | null;
  }
) {
  const existing = await prisma.caretakerProfile.findUnique({
    where: { userId },
  });

  if (!existing) {
    throw new Error("Caretaker profile record not found.");
  }

  return await prisma.caretakerProfile.update({
    where: { userId },
    data: {
      specialization: data.specialization !== undefined ? data.specialization : existing.specialization,
      yearsOfExperience:
        data.yearsOfExperience !== undefined ? data.yearsOfExperience : existing.yearsOfExperience,
      backgroundSummary:
        data.backgroundSummary !== undefined ? data.backgroundSummary : existing.backgroundSummary,
    },
  });
}
