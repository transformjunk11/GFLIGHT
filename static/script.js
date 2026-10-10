document.addEventListener('DOMContentLoaded', () => {
    // Set default date to 30 days from now
    const dateInput = document.getElementById('date');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    dateInput.value = futureDate.toISOString().split('T')[0];

    const form = document.getElementById('search-form');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const resultsContainer = document.getElementById('results-container');
    const filterPanel = document.getElementById('filter-panel');
    const maxPriceInput = document.getElementById('max-price');
    const maxDurationInput = document.getElementById('max-duration');
    const filterAirline = document.getElementById('filter-airline');
    const sortBy = document.getElementById('sort-by');
    const priceVal = document.getElementById('price-val');
    const durationVal = document.getElementById('duration-val');

    let allFlights = [];
    let currency = 'INR';

    function formatPrice(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function updateFilterLabels() {
        const p = maxPriceInput.value;
        priceVal.textContent = p == maxPriceInput.max ? 'Any' : formatPrice(Number(p));
        
        const d = maxDurationInput.value;
        if (d == maxDurationInput.max) {
            durationVal.textContent = 'Any';
        } else {
            const h = Math.floor(d / 60);
            const m = d % 60;
            durationVal.textContent = `${h}h ${m}m`;
        }
    }

    [maxPriceInput, maxDurationInput, filterAirline, sortBy].forEach(el => {
        el.addEventListener('input', () => {
            updateFilterLabels();
            applyFilters();
        });
    });

    function applyFilters() {
        const maxP = parseInt(maxPriceInput.value);
        const maxD = parseInt(maxDurationInput.value);
        const airlineVal = filterAirline.value;
        const sortVal = sortBy.value;

        let filtered = allFlights.filter(f => {
            if (maxP < parseInt(maxPriceInput.max) && f.price && f.price > maxP) return false;
            if (maxD < parseInt(maxDurationInput.max) && f.duration && f.duration > maxD) return false;
            if (airlineVal !== 'any') {
                if (!f.airlines.includes(airlineVal)) return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            if (sortVal === 'price_asc') return a.price - b.price;
            if (sortVal === 'price_desc') return b.price - a.price;
            if (sortVal === 'duration_asc') return a.duration - b.duration;
            if (sortVal === 'duration_desc') return b.duration - a.duration;
            if (sortVal === 'departure_asc') return a.departure_time.localeCompare(b.departure_time);
            if (sortVal === 'departure_desc') return b.departure_time.localeCompare(a.departure_time);
            return 0;
        });

        renderResults(filtered);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI loading state
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        filterPanel.classList.add('hidden');

        const requestData = {
            from_airport: document.getElementById('from_airport').value.toUpperCase(),
            to_airport: document.getElementById('to_airport').value.toUpperCase(),
            date: document.getElementById('date').value,
            adults: parseInt(document.getElementById('adults').value),
            seat: document.getElementById('seat').value
        };

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                allFlights = data.flights;
                currency = data.currency || 'INR';
                if (allFlights.length > 0) {
                    filterPanel.classList.remove('hidden');
                    
                    // Populate airline options
                    const airlines = new Set();
                    allFlights.forEach(f => f.airlines.forEach(a => airlines.add(a)));
                    const sortedAirlines = Array.from(airlines).sort();
                    
                    filterAirline.innerHTML = '<option value="any">All Airlines</option>';
                    sortedAirlines.forEach(a => {
                        const opt = document.createElement('option');
                        opt.value = a;
                        opt.textContent = a;
                        filterAirline.appendChild(opt);
                    });
                }
                updateFilterLabels();
                applyFilters();
            } else {
                showError(data.error || 'Failed to fetch flights.');
            }
        } catch (error) {
            showError('A network error occurred.');
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    function renderResults(flights) {
        if (!flights || flights.length === 0) {
            resultsContainer.innerHTML = '<div class="message-card">No flights found matching your criteria.</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        let html = `
            <table class="flight-table">
                <thead>
                    <tr>
                        <th>Airline</th>
                        <th>Schedule</th>
                        <th>Duration</th>
                        <th>Stops</th>
                        <th>Equipment</th>
                        <th class="text-right">Price</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        flights.forEach((flight, index) => {
            const durationHours = Math.floor(flight.duration / 60);
            const durationMins = flight.duration % 60;
            const durationStr = flight.duration ? `${durationHours}h ${durationMins}m` : 'N/A';
            const stopsStr = flight.stops === 0 ? 'Non-stop' : flight.stops + ' Stop(s)';
            const priceStr = flight.price ? formatPrice(flight.price) : 'N/A';
            const equipStr = flight.equipment || 'N/A';

            html += `
                <tr style="animation-delay: ${index * 0.02}s">
                    <td class="fw-600">${flight.airlines.join(', ')}</td>
                    <td>${flight.departure_time} &mdash; ${flight.arrival_time}</td>
                    <td class="text-sec">${durationStr}</td>
                    <td class="text-sec">${stopsStr}</td>
                    <td class="text-sec">${equipStr}</td>
                    <td class="text-right price-cell">${priceStr}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        resultsContainer.innerHTML = html;

        resultsContainer.classList.remove('hidden');
    }

    function showError(message) {
        resultsContainer.innerHTML = `<div class="message-card" style="color: #DC2626; border-color: #FCA5A5;">Error: ${message}</div>`;
        resultsContainer.classList.remove('hidden');
    }
});
