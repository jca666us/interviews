package com.elsevier.education;

/**

TODO: Turn the "Singleton" class into an actual singleton. The main() method should still call .doSomething().

*/
public class Exercise5 {
	
	public class Singleton {

		private static Singleton mySingleton;
    
		/**
	     	* Create private constructor
	     	*/
	    	private Singleton(){}

	   	/**
	     	* Create a static method to get instance
	     	*/
	    	public static Singleton getInstance(){
        		if(mySingleton == null){
        	    	mySingleton = new Singleton();
        	}
        return mySingleton;
    	}

	public void doSomething() {
		System.out.println("Doing something....");
	}
		
	public static void main(String a[]){
		Singleton st = Singleton.getInstance();
		st.doSomeThing();
	}
}
