import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

// Shared system species list ({ name, category }), fetched once and reused wherever a
// species -> category lookup is needed (appearance field labels, category browsing, etc.).
export const useSpeciesList = () => {
    const [speciesList, setSpeciesList] = useState([]);
    useEffect(() => {
        axios.get(`${API_BASE_URL}/species`)
            .then((res) => setSpeciesList(Array.isArray(res.data) ? res.data : []))
            .catch(() => setSpeciesList([]));
    }, []);
    return speciesList;
};
