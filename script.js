'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    marker;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
            months[this.date.getMonth()]
        } ${this.date.getDate()}`;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // in min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}
class Cycling extends Workout {
    type = 'cycling';

    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // in km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}

// Application Architecture
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));

        inputType.addEventListener('change', this._toggleElevationField.bind(this));

        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
                console.error('Could not get your position');
                alert('Could not get your position');
            });
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;

        // Display map on current location
        this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(w => {
            this._renderWorkoutMarker(w);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        // Render workout form
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        // Hide form
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {
        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const isPositiveInputs = (...inputs) => inputs.every(input => input > 0);

        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // If workout running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;

            // Check if data is valid
            if (!validInputs(distance, duration, cadence) || !isPositiveInputs(distance, duration, cadence))
                return alert('Inputs have to be a positive number!');

            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // If workout cycling, create cycling object
        if (type === 'cycling') {
            const elevationGain = +inputElevation.value;

            // Check if data is valid
            if (!validInputs(distance, duration, elevationGain) || !isPositiveInputs(distance, duration))
                return alert('Inputs have to be a positive number!');

            workout = new Cycling([lat, lng], distance, duration, elevationGain);
        }

        // Add the new object to workout array
        this.#workouts.push(workout);

        // Display marker for a created workout
        this._renderWorkoutMarker(workout);

        // Render workout on list
        this._renderWorkout(workout);

        // Hide form and Clear input fields
        this._hideForm();

        // Set local storage to all workouts
        this._setLocalStorage();
    }

    _findWorkoutElement = e => e.target.closest('.workout');

    _findWorkout = el => this.#workouts.find(w => w.id === el.dataset.id);

    _removeWorkout(e) {
        // Find element in DOM
        const workoutEl = this._findWorkoutElement(e);

        if (!workoutEl) {
            alert('Some error! Cannot find an item');
            return;
        }

        // Find item in array
        const workout = this._findWorkout(workoutEl);
        if (!workout) return;

        const index = this.#workouts.indexOf(workout);
        if (index > -1) {
            this.#workouts.splice(index, 1);
            workoutEl.remove();
            workout.marker.remove();

            // Save changes
            // TODO TypeError: Converting circular structure to JSON
            this._setLocalStorage();
        }
    }

    _renderWorkoutMarker(workout) {
        workout.marker = L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`,
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

        if (workout.type === 'running') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>`;
        }

        if (workout.type === 'cycling') {
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>`;
        }

        html += `<div class="workout__actions">
                <button class="workout__delete">Delete</button>
                <button class="workout__edit">Edit</button>
            </div>
        </li>`;

        form.insertAdjacentHTML('afterend', html);

        // Attach an event handlers
        const deleteBtn = containerWorkouts.querySelector('.workout__delete');
        deleteBtn.addEventListener('click', this._removeWorkout.bind(this));
    }

    _moveToPopup(e) {
        if (!this.#map) return;

        const workoutEl = this._findWorkoutElement(e);
        if (!workoutEl) return;

        const workout = this._findWorkout(workoutEl);
        if (!workout) return;

        this.#map.setView(workout.coords, this.#map.getZoom(), {
            animate: true,
            pan: {
                duration: 1,
            },
        });
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const workoutData = JSON.parse(localStorage.getItem('workouts'));

        if (!workoutData) return;

        this.#workouts = workoutData;

        this.#workouts.forEach(w => {
            this._renderWorkout(w);
        });
    }

    reset() {
        if (confirm('Do you really want to delete ALL of your workouts? They can not be restored after.')) {
            localStorage.removeItem('workouts');
            location.reload();
        }
    }
}

const app = new App();

// Deletion features
const deleteAllBtn = document.querySelector('.sidebar__btn--deleteAll');
deleteAllBtn.addEventListener('click', app.reset);
