document.addEventListener('DOMContentLoaded', () => {
    const fromInput = document.getElementById('from_airport');
    const toInput = document.getElementById('to_airport');
    const dateInput = document.getElementById('date');
    const adultsInput = document.getElementById('adults');
    const seatInput = document.getElementById('seat');
    const swapBtn = document.getElementById('swap-airports');
    const form = document.getElementById('search-form');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    const resultsContainer = document.getElementById('results-container');
    const filterBar = document.getElementById('filter-bar');
    const maxPriceInput = document.getElementById('max-price');
    const maxDurationInput = document.getElementById('max-duration');
    const filterAirline = document.getElementById('filter-airline');
    const sortBy = document.getElementById('sort-by');
    const priceVal = document.getElementById('price-val');
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

    function resetFilters() {
        maxPriceInput.value = maxPriceInput.max;
        maxDurationInput.value = maxDurationInput.max;
        filterAirline.value = 'any';
        sortBy.value = 'price_asc';
        updateFilterLabels();
        applyFilters();
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
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
            if (airlineVal !== 'any' && !f.airlines.includes(airlineVal)) return false;
            return true;
        });

        // Sorting
        filtered.sort((a, b) => {
            if (sortVal === 'price_asc') return (a.price || 0) - (b.price || 0);
            if (sortVal === 'price_desc') return (b.price || 0) - (a.price || 0);
            if (sortVal === 'duration_asc') return (a.duration || 0) - (b.duration || 0);
            if (sortVal === 'departure_asc') return (a.departure_time || '').localeCompare(b.departure_time || '');
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

        const requestData = {
            from_airport: fromInput.value.trim().toUpperCase(),
            to_airport: toInput.value.trim().toUpperCase(),
            date: dateInput.value,
            adults: parseInt(adultsInput.value),
            seat: seatInput.value
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

                    const prices = allFlights.map(f => f.price).filter(Boolean);
                    if (prices.length > 0) {
                        const highestPrice = Math.max(...prices);
                        maxPriceInput.max = Math.ceil(highestPrice / 1000) * 1000;
                        maxPriceInput.value = maxPriceInput.max;
                    }

                    const airlines = new Set();
                    allFlights.forEach(f => (f.airlines || []).forEach(a => airlines.add(a)));
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
                    <div class="message-title">No matching flights found</div>
                    <div class="message-desc">Try loosening your filters or picking a different date.</div>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
            return;
        }

        const cheapestPrice = Math.min(...flights.map(f => f.price).filter(Boolean));

        let html = '<div class="flight-cards-list">';

        flights.forEach((flight) => {
            const durationHours = Math.floor((flight.duration || 0) / 60);
            const durationMins = (flight.duration || 0) % 60;
            const durationStr = `${durationHours}h ${durationMins}m`;
            const priceStr = formatPrice(flight.price);
            const isBestDeal = flight.price && flight.price === cheapestPrice;
            const nextDayBadge = flight.next_day ? '<span style="color:#ef4444; font-size:0.65rem; font-weight:700;">+1d</span>' : '';

            html += `
                <div class="compact-ticket">
                    <!-- Airline Info -->
                    <div class="ticket-airline">
                        <div class="airline-info">
                            <span class="airline-name-text">${flight.airlines.join(', ')}</span>
                            <span class="flight-number-text">${flight.flight_number || 'Non-stop'} · ${flight.equipment || 'Jet'}</span>
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
                            <span class="stop-tag">Direct</span>
                        </div>

                        <div class="time-point">
                            <span class="flight-time">${flight.arrival_time} ${nextDayBadge}</span>
                            <span class="airport-code">${flight.to_code || toInput.value.toUpperCase()}</span>
                        </div>
                    </div>

                    <!-- Fare / Price -->
                    <div class="ticket-price">
                        ${isBestDeal ? '<span class="best-pill">Cheapest</span>' : ''}
                        <span class="price-text">${priceStr}</span>
                        <span class="price-sub">per person</span>
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
                <div class="message-title" style="color: #b91c1c;">Error Fetching Flights</div>
                <div class="message-desc" style="color: #7f1d1d; white-space: pre-wrap; font-family: var(--font-mono); font-size: 0.78rem;">${message}</div>
            </div>
        `;
        resultsContainer.classList.remove('hidden');
    }
});
