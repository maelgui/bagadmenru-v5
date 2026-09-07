/** Values collected by the invitation signup form. */
export interface SignupFormValues {
  firstName: string;
  lastName: string;
  email: string;
  instrumentId: string; // native select yields strings
}
