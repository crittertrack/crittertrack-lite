import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

// Shared system species list ({ name, category }), fetched once and reused wherever a
// species -> category lookup is needed (appearance field labels, category browsing, etc.).
export const useSpeciesList = () => {
    const [speciesList, setSpeciesList] = useState([]);
    useEffect(() => {
        apiClient.get('/species')
            .then((res) => setSpeciesList(Array.isArray(res.data) ? res.data : []))
            .catch(() => setSpeciesList([]));
    }, []);
    return speciesList;
};
