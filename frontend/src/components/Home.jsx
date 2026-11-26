import React, { useEffect, useState } from "react";
import {
  sortByRatings,
  sortByReviews,
  toggleVegOnly,
} from "../redux/slices/restaurantSlice";

import {
  createRestaurant,
  getRestaurants,
  getNearbyRestaurants,
} from "../redux/actions/restaurantAction";
import Restaurant from "./Restaurant";
import Loader from "./layout/Loader";
import Message from "./Message";
import { useDispatch, useSelector } from "react-redux";
import CountRestaurant from "./CountRestaurant";
import { useParams } from "react-router-dom";

const Home = () => {
  const dispatch = useDispatch();
  const { keyword } = useParams();

  const {
    loading: restaurantsLoading,
    error: restaurantsError,
    restaurants,
    showVegOnly,
    creating,
    createError,
  } = useSelector((state) => state.restaurants);

  const { isAuthenticated, user } = useSelector((state) => state.user);

  // nearby restaurants
  const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [nearbyRequested, setNearbyRequested] = useState(false);
  const [geoError, setGeoError] = useState("");

  const handleNearMe = () => {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("Your browser does not support location access.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setNearbyRequested(true);
      },
      () => {
        setLocating(false);
        setGeoError(
          "Could not get your location. Please allow location access and try again.",
        );
      },
      { timeout: 10000 },
    );
  };

  const handleShowAll = () => {
    setNearbyRequested(false);
    setGeoError("");
    dispatch(getRestaurants(keyword));
  };

  // (re)load nearby restaurants when the location or radius changes
  useEffect(() => {
    if (nearbyRequested && coords) {
      dispatch(getNearbyRestaurants({ ...coords, radius }));
    }
  }, [dispatch, nearbyRequested, coords, radius]);

  useEffect(() => {
    dispatch(getRestaurants(keyword));
  }, [dispatch, keyword]);

  const handleSortByRatings = () => {
    dispatch(sortByRatings());
  };

  const handleSortByReviews = () => {
    dispatch(sortByReviews());
  };

  // admin controls
  const [showCreate, setShowCreate] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    address: "",
    isVeg: false,
    location: { type: "Point", coordinates: [] },
    imageUrl: "",
  });
  const [coordsInput, setCoordsInput] = React.useState("");

  const handleOpenCreate = () => {
    setCoordsInput(newRestaurant.location.coordinates.join(","));
    setShowCreate(true);
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    setCoordsInput("");
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;

    if (name === "isVeg") {
      setNewRestaurant({ ...newRestaurant, isVeg: checked });
    } else if (name === "coordinates") {
      setCoordsInput(value);

      const parts = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== "");

      const coords = parts.map((v) => parseFloat(v)).filter((n) => !isNaN(n));

      setNewRestaurant({
        ...newRestaurant,
        location: { ...newRestaurant.location, coordinates: coords },
      });
    } else if (name === "imageUrl") {
      setNewRestaurant({ ...newRestaurant, imageUrl: value });
    } else {
      setNewRestaurant({ ...newRestaurant, [name]: value });
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();

    const payload = {
      name: newRestaurant.name,
      address: newRestaurant.address,
      isVeg: newRestaurant.isVeg,
      location: newRestaurant.location,
      images: [
        {
          public_id: "default",
          url: newRestaurant.imageUrl,
        },
      ],
    };

    const result = await dispatch(createRestaurant(payload));

    // ✅ close only if success
    if (createRestaurant.fulfilled.match(result)) {
      handleCloseCreate();
      setCoordsInput("");
    }
  };

  const handleToggleVegOnly = () => {
    dispatch(toggleVegOnly());
  };

  return (
    <>
      <CountRestaurant />
      {restaurantsLoading ? (
        <Loader />
      ) : restaurantsError ? (
        <Message variant="danger"> {restaurantsError}</Message>
      ) : (
        <>
          <section>
            <div className="nearby-bar">
              <button
                className="nearby-btn"
                onClick={handleNearMe}
                disabled={locating}
              >
                {locating ? "Locating..." : "📍 Near me"}
              </button>

              <select
                className="nearby-radius"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                {[2, 5, 10, 25].map((km) => (
                  <option key={km} value={km}>
                    Within {km} km
                  </option>
                ))}
              </select>

              {nearbyRequested && (
                <button className="nearby-btn" onClick={handleShowAll}>
                  Show all
                </button>
              )}
            </div>

            {geoError && <Message variant="danger">{geoError}</Message>}

            <div className="sort">
              <button className="sort_veg p-3" onClick={handleToggleVegOnly}>
                {showVegOnly ? "Show All" : "Pure Veg"}
              </button>

              <button className="sort_rev p-3" onClick={handleSortByReviews}>
                Sort By Reviews
              </button>

              <button className="sort_rate p-3" onClick={handleSortByRatings}>
                Sort By ratings
              </button>
            </div>

            <div className="row mt-4">
              {/* ✅ FIXED HERE */}
              {restaurants && restaurants.length > 0 ? (
                restaurants.map((restaurant) =>
                  !showVegOnly || restaurant.isVeg ? (
                    <Restaurant key={restaurant._id} restaurant={restaurant} />
                  ) : null,
                )
              ) : (
                <Message variant="info">
                  {nearbyRequested
                    ? `No restaurants within ${radius} km. Try a bigger radius.`
                    : "No restaurants Found."}
                </Message>
              )}

              {/* admin add restaurant button */}
              {isAuthenticated && user && user.role === "admin" && (
                <div className="col-sm-12 col-md-6 col-lg-3 my-3">
                  <div
                    className="card p-3 rounded text-center d-flex align-items-center justify-content-center"
                    style={{ cursor: "pointer" }}
                    onClick={handleOpenCreate}
                  >
                    <h1 className="m-0">+</h1>
                    <p className="mb-0">Add Restaurant</p>
                  </div>
                </div>
              )}
            </div>

            {/* create form modal */}
            {showCreate && (
              <div className="create-modal">
                <div className="create-content">
                  <h3>Create Restaurant</h3>

                  <form onSubmit={submitCreate}>
                    {createError && (
                      <Message variant="danger">{createError}</Message>
                    )}

                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        name="name"
                        value={newRestaurant.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <input
                        type="text"
                        name="address"
                        value={newRestaurant.address}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Pure Veg</label>
                      <input
                        type="checkbox"
                        name="isVeg"
                        checked={newRestaurant.isVeg}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Coordinates (longitude,latitude)</label>
                      <input
                        type="text"
                        name="coordinates"
                        value={coordsInput}
                        onChange={handleChange}
                        placeholder="e.g. 77.59,12.97"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Image URL</label>
                      <input
                        type="text"
                        name="imageUrl"
                        value={newRestaurant.imageUrl}
                        onChange={handleChange}
                        placeholder="https://..."
                        required
                      />
                    </div>

                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={creating}
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>

                    <button
                      className="btn btn-secondary ml-2"
                      type="button"
                      onClick={handleCloseCreate}
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
};

export default Home;
