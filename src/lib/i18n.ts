export type Locale = "fr" | "en";

const messages = {
  fr: {
    waitingInvitation: "En attente d'une invitation de votre garderie...",
    waitingInvitationHint:
      "Votre compte parent sera activé dès qu'un administrateur vous enverra un lien d'inscription.",
    registerTitle: "Créer votre compte",
    registerSubtitle: "Complétez votre inscription pour rejoindre Sprout.",
    fullName: "Nom complet",
    email: "Courriel",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    submitRegister: "Créer mon compte",
    registering: "Inscription…",
    inviteInvalid: "Cette invitation est invalide ou a expiré.",
    inviteAccepted: "Compte créé. Redirection…",
    inviteInstructorTitle: "Inviter un éducateur",
    inviteInstructorCta: "Envoyer l'invitation",
    inviteParentTitle: "Ajouter un enfant et inviter un parent",
    inviteParentCta: "Créer et inviter",
    invitationLinkCopied: "Lien d'invitation copié",
    invitationCreated: "Invitation créée",
    parentLinked: "Parent existant lié à l'enfant",
    firstName: "Prénom",
    lastName: "Nom de famille",
    dob: "Date de naissance",
    classroom: "Groupe",
    parentEmail: "Courriel du parent",
    centerRequired: "Aucun centre configuré pour ce compte.",
    passwordMismatch: "Les mots de passe ne correspondent pas.",
    passwordMin: "Le mot de passe doit contenir au moins 8 caractères.",
    required: "Ce champ est obligatoire.",
    invalidEmail: "Entrez une adresse courriel valide.",
    roleEce: "Éducateur",
    roleParent: "Parent",
    roleAdmin: "Direction",
    backToLogin: "Retour à la connexion",
  },
  en: {
    waitingInvitation: "Waiting for an invitation from your daycare...",
    waitingInvitationHint:
      "Your parent account will activate once an administrator sends you a registration link.",
    registerTitle: "Create your account",
    registerSubtitle: "Complete registration to join Sprout.",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    submitRegister: "Create my account",
    registering: "Creating account…",
    inviteInvalid: "This invitation is invalid or has expired.",
    inviteAccepted: "Account created. Redirecting…",
    inviteInstructorTitle: "Invite an educator",
    inviteInstructorCta: "Send invitation",
    inviteParentTitle: "Add a child and invite a parent",
    inviteParentCta: "Create and invite",
    invitationLinkCopied: "Invitation link copied",
    invitationCreated: "Invitation created",
    parentLinked: "Existing parent linked to child",
    firstName: "First name",
    lastName: "Last name",
    dob: "Date of birth",
    classroom: "Classroom",
    parentEmail: "Parent email",
    centerRequired: "No center configured for this account.",
    passwordMismatch: "Passwords do not match.",
    passwordMin: "Password must be at least 8 characters.",
    required: "This field is required.",
    invalidEmail: "Enter a valid email address.",
    roleEce: "Educator",
    roleParent: "Parent",
    roleAdmin: "Director",
    backToLogin: "Back to sign in",
  },
} as const;

export type MessageKey = keyof (typeof messages)["fr"];

export function t(key: MessageKey, locale: Locale = "fr"): string {
  return messages[locale][key] ?? messages.fr[key];
}

export const defaultLocale: Locale = "fr";
