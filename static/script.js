document.addEventListener('DOMContentLoaded', () => {
    const fromInput = document.getElementById('from_airport');
    const toInput = document.getElementById('to_airport');
    const dateInput = document.getElementById('date');
    const stopsSelect = document.getElementById('stops');
    const adultsInput = document.getElementById('adults');
    const seatInput = document.getElementById('seat');
    const swapBtn = document.getElementById('swap-airports');
    const form = document.getElementById('search-form');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const resultsContainer = document.getElementById('results-container');
    const filterBar = document.getElementById('filter-bar');
    const filterStops = document.getElementById('filter-stops');
    const maxDurationInput = document.getElementById('max-duration');
    const filterAirline = document.getElementById('filter-airline');
    const sortBy = document.getElementById('sort-by');
    const durationVal = document.getElementById('duration-val');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const statTotal = document.getElementById('stat-total');

    // Default search date to 30 days ahead
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    dateInput.value = futureDate.toISOString().split('T')[0];

    // Airport Swap Button
    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;
        });
    }

    // Quick Route Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            fromInput.value = chip.dataset.from;
            toInput.value = chip.dataset.to;
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    });

    let allFlights = [];
    let currency = 'INR';

    function formatPrice(amount) {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function updateFilterLabels() {
        const d = maxDurationInput.value;
        if (d == maxDurationInput.max) {
            durationVal.textContent = 'Any';
        } else {
            const h = Math.floor(d / 60);
            const m = d % 60;
            durationVal.textContent = `${h}h ${m}m`;
        }
    }

    function resetFilters() {
        maxDurationInput.value = maxDurationInput.max;
        if (filterStops) filterStops.value = 'all';
        if (filterAirline) filterAirline.value = 'any';
        if (sortBy) sortBy.value = 'departure_asc';
        updateFilterLabels();
        applyFilters();
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }

    [maxDurationInput, filterStops, filterAirline, sortBy].filter(Boolean).forEach(el => {
        el.addEventListener('input', () => {
            updateFilterLabels();
            applyFilters();
        });
    });

    function applyFilters() {
        const maxD = parseInt(maxDurationInput.value);
        const stopsVal = filterStops ? filterStops.value : 'all';
        const airlineVal = filterAirline ? filterAirline.value : 'any';
        const sortVal = sortBy ? sortBy.value : 'departure_asc';

        let filtered = allFlights.filter(f => {
            if (maxD < parseInt(maxDurationInput.max) && f.duration && f.duration > maxD) return false;
            if (airlineVal !== 'any' && !f.airlines.includes(airlineVal)) return false;
            if (stopsVal === 'nonstop' && f.stops !== 0) return false;
            if (stopsVal === 'connecting' && f.stops === 0) return false;
            return true;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortVal === 'departure_asc') return (a.departure_time || '').localeCompare(b.departure_time || '');
            if (sortVal === 'price_asc') return (a.price || 0) - (b.price || 0);
            if (sortVal === 'price_desc') return (b.price || 0) - (a.price || 0);
            if (sortVal === 'duration_asc') return (a.duration || 0) - (b.duration || 0);
            return 0;
        });

        if (statTotal) {
            statTotal.textContent = `${filtered.length} flight${filtered.length === 1 ? '' : 's'}`;
        }

        renderResults(filtered);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI loading state
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        if (filterBar) filterBar.classList.add('hidden');

        const stopsVal = stopsSelect.value;
        const maxStopsParam = stopsVal === 'any' ? null : parseInt(stopsVal);

        const requestData = {
            from_airport: fromInput.value.trim().toUpperCase(),
            to_airport: toInput.value.trim().toUpperCase(),
            date: dateInput.value,
            adults: parseInt(adultsInput.value),
            seat: seatInput.value,
            max_stops: maxStopsParam
        };

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                let detail = `HTTP ${response.status}`;
                try {
                    const errBody = await response.text();
                    detail += `: ${errBody.substring(0, 300)}`;
                } catch (_) {}
                showError(detail);
                return;
            }

            const data = await response.json();

            if (data.success) {
                allFlights = data.flights || [];
                currency = data.currency || 'INR';

                if (allFlights.length > 0) {
                    if (filterBar) filterBar.classList.remove('hidden');

                    const durations = allFlights.map(f => f.duration).filter(Boolean);
                    if (durations.length > 0) {
                        const maxD = Math.max(...durations);
                        maxDurationInput.max = Math.ceil(maxD / 60) * 60;
                        maxDurationInput.value = maxDurationInput.max;
                    }

                    const airlines = new Set();
                    allFlights.forEach(f => (f.airlines || []).forEach(a => airlines.add(a)));
                    const sortedAirlines = Array.from(airlines).sort();

                    filterAirline.innerHTML = '<option value="any">All Carriers</option>';
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
                let msg = data.error || 'Failed to fetch flights.';
                if (data.hint) msg += `\n\n💡 Hint: ${data.hint}`;
                showError(msg);
            }
        } catch (error) {
            showError(`Network error: ${error.message || error}`);
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    function renderResults(flights) {
        if (!flights || flights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="message-card">
                    <div class="message-icon">🔍</div>
                    <div class="message-title">No matching staff itineraries found</div>
                    <div class="message-desc">Try selecting "Any Stops" or choosing a different travel date.</div>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
            return;
        }

        const validPrices = flights.map(f => f.price).filter(Boolean);
        const cheapestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

        let html = '<div class="flight-cards-list">';

        flights.forEach((flight) => {
            const durationHours = Math.floor((flight.duration || 0) / 60);
            const durationMins = (flight.duration || 0) % 60;
            const durationStr = `${durationHours}h ${durationMins}m`;
            const priceStr = flight.price ? formatPrice(flight.price) : 'Fare N/A';
            const isBestDeal = cheapestPrice && flight.price === cheapestPrice;
            const nextDayBadge = flight.next_day ? '<span style="color:#ef4444; font-size:0.65rem; font-weight:700;">+1d</span>' : '';

            // Stops label
            let stopHtml = '';
            if (flight.stops === 0) {
                stopHtml = '<span class="stop-tag direct">Direct</span>';
            } else {
                const layoverList = (flight.layover_codes && flight.layover_codes.length > 0)
                    ? `via ${flight.layover_codes.join(', ')}`
                    : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;
                stopHtml = `<span class="stop-tag connecting">${layoverList}</span>`;
            }

            html += `
                <div class="compact-ticket">
                    <!-- Airline Info -->
                    <div class="ticket-airline">
                        <div class="airline-info">
                            <span class="airline-name-text">${flight.airlines.join(', ')}</span>
                            <span class="flight-number-text">${flight.flight_number || 'Multiple Legs'} · ${flight.equipment || 'Jet'}</span>
                        </div>
                    </div>

                    <!-- Route Timeline -->
                    <div class="ticket-route">
                        <div class="time-point">
                            <span class="flight-time">${flight.departure_time}</span>
                            <span class="airport-code">${flight.from_code || fromInput.value.toUpperCase()}</span>
                        </div>

                        <div class="flight-path">
                            <span class="flight-duration">${durationStr}</span>
                            <div class="path-line">
                                <span class="path-plane">✈</span>
                            </div>
                            ${stopHtml}
                        </div>

                        <div class="time-point">
                            <span class="flight-time">${flight.arrival_time} ${nextDayBadge}</span>
                            <span class="airport-code">${flight.to_code || toInput.value.toUpperCase()}</span>
                        </div>
                    </div>

                    <!-- Fare / Price -->
                    <div class="ticket-price">
                        ${isBestDeal ? '<span class="best-pill">Lowest</span>' : ''}
                        <span class="price-text">${priceStr}</span>
                        <span class="price-sub">per seat</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="message-card" style="border-color: #fca5a5; background: #fff5f5;">
                <div class="message-icon">⚠️</div>
                <div class="message-title" style="color: #b91c1c;">Error Fetching Itineraries</div>
                <div class="message-desc" style="color: #7f1d1d; white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.78rem;">${message}</div>
            </div>
        `;
        resultsContainer.classList.remove('hidden');
    }
});
