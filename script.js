'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;

// Get user geolocation
if (navigator.geolocation)
    navigator.geolocation.getCurrentPosition(
        function (position) {
            const { latitude, longitude } = position.coords;
            console.log(latitude, longitude);
            console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

            // Display map on current location
            map = L.map('map').setView([latitude, longitude], 13);

            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(map);

            L.marker([latitude, longitude])
                .addTo(map)
                .bindPopup(L.popup({ content: `I'm here`, closeOnClick: false, autoClose: false }))
                .openPopup();

            // Handling clicks on map
            map.on('click', function (mapE) {
                mapEvent = mapE;
                // Render workout form
                form.classList.remove('hidden');
                inputDistance.focus();
            });
        },
        function () {
            console.error('Could not get your position');
        }
    );

form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Clear input fields
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

    // Display marker
    console.log(mapEvent);
    const { lat, lng } = mapEvent.latlng;
    L.marker([lat, lng])
        .addTo(map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: 'running-popup',
            })
        )
        .setPopupContent('Workout')
        .openPopup();
});

inputType.addEventListener('change', function () {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
});
