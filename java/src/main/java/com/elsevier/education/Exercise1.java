package com.elsevier.education;

import java.util.Set;

/**

TODO: Make this class immutable.

*/
public final class Exercise1 {

	/**
	*
	* Person is declared as final so that it cannot be extended.
	*
	**/
	public final class Person {

		/**
		*
		*
		* All fields are private so that direct access is not allowed.
		*
		**/
		private final Set<String> phoneNumbers;
		private final String firstName;
		private final String lastName;
		
		/**
	 	* Initialize all the fields via constructor performing deep copy.
	 	* @param pns
	 	* @param fn
	 	* @param ln
	 	*/
		public Person(String fn, String ln, Set<String> pns) {
			this.firstName = fn;
			this.lastName = ln;
			Collection<E> oldSet = pns;
			TreeSet<E> tempPhone = new TreeSet<E>(pns);
			this.phoneNumbers = tempPhone;
		}

		/**
		*
		*
		* Public getter methods 
		*
		**/
		public Set<String> getPhoneNumbers() {
			return phoneNumbers;
		}

		public String getFirstName() {
			return firstName;
		}

		public String getLastName() {
			return lastName;
		}
	}
}
