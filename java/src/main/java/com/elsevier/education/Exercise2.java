package com.elsevier.education;

/**

TODO refactor the Car to use dependency injection of the engine
TODO allow use of either a gas engine or electric engine (create an appropriate abstraction)
TODO make sure we have no-op implementations of the gas engine and electric engine

*/
public class Exercise2 {

	public static class Car {
		
		private Engine engine = new Engine();
		
		public Car(Engine engine) {
			this.engine = engine;
		}
		
		public void moveForward() {
			engine.spinWheels();
		}
	
		public static class GasEngine {
			public void spinWheels() {
				// no-op for now
			}
		}

		public static class ElectricEngine {
			public void spinWheels() {
				// no-op for now
			}
		}
	}

	public static void main(String[] args) { 
		Car greatCar = new Car(new ElectricEngine());
		Car oldCar = new Car(new GasEngine());
	}
}
